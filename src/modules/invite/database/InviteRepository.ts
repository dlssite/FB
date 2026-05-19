import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';

export class InviteRepository {
  /**
   * Fetches or initializes the invite settings for a guild with Redis caching.
   */
  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:invite:${tenantId}:${guildId}`;
    const cached = await RedisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let settings = await prisma.invite_settings.findUnique({
      where: { guildId_tenantId: { guildId, tenantId } }
    });

    if (!settings) {
      settings = await prisma.invite_settings.create({
        data: { 
          guildId, 
          tenantId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    await RedisService.set(cacheKey, JSON.stringify(settings), 300);
    return settings;
  }

  /**
   * Updates invite settings for a guild.
   */
  static async updateSettings(tenantId: string, guildId: string, data: any) {
    const result = await prisma.invite_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: {
        ...data,
        updatedAt: new Date()
      },
      create: { 
        tenantId, 
        guildId, 
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    await this.invalidateCache(tenantId, guildId);
    return result;
  }

  /**
   * Invalidates invite settings cache.
   */
  static async invalidateCache(tenantId: string, guildId: string) {
    await RedisService.del(`settings:invite:${tenantId}:${guildId}`);
  }

  /**
   * Gets the invite statistics for a user.
   */
  static async getUserStats(tenantId: string, guildId: string, userId: string) {
    let stats = await prisma.invites.findUnique({
      where: { guildId_userId_tenantId: { guildId, userId, tenantId } }
    });
    if (!stats) {
      stats = await prisma.invites.create({
        data: { 
          guildId, 
          userId, 
          tenantId
        }
      });
    }
    return stats;
  }

  /**
   * Increments the joins count for a user.
   */
  static async addJoins(tenantId: string, guildId: string, userId: string, amount: number = 1) {
    return await prisma.invites.upsert({
      where: { guildId_userId_tenantId: { guildId, userId, tenantId } },
      update: { 
        invites: { increment: amount }
      },
      create: { 
        guildId, 
        userId, 
        tenantId, 
        invites: amount
      }
    });
  }

  /**
   * Increments the leaves count for a user.
   */
  static async addLeaves(tenantId: string, guildId: string, userId: string, amount: number = 1) {
    return await prisma.invites.upsert({
      where: { guildId_userId_tenantId: { guildId, userId, tenantId } },
      update: { 
        leaves: { increment: amount }
      },
      create: { 
        guildId, 
        userId, 
        tenantId, 
        leaves: amount
      }
    });
  }

  /**
   * Increments the fakes count for a user.
   */
  static async addFakes(tenantId: string, guildId: string, userId: string, amount: number = 1) {
    return await prisma.invites.upsert({
      where: { guildId_userId_tenantId: { guildId, userId, tenantId } },
      update: { 
        fake: { increment: amount }
      },
      create: { 
        guildId, 
        userId, 
        tenantId, 
        fake: amount
      }
    });
  }

  /**
   * Adds or subtracts bonus invites for a user.
   */
  static async setBonus(tenantId: string, guildId: string, userId: string, amount: number) {
    return await prisma.invites.upsert({
      where: { guildId_userId_tenantId: { guildId, userId, tenantId } },
      update: { 
        bonus: amount
      },
      create: { 
        guildId, 
        userId, 
        tenantId, 
        bonus: amount
      }
    });
  }

  /**
   * Increments the rejoins count.
   */
  static async addRejoin(tenantId: string, guildId: string, userId: string, amount: number = 1) {
    return await prisma.invites.upsert({
      where: { guildId_userId_tenantId: { guildId, userId, tenantId } },
      update: { 
        rejoins: { increment: amount }
      },
      create: { 
        guildId, 
        userId, 
        tenantId, 
        rejoins: amount
      }
    });
  }

  /**
   * Logs an invite history record when a user joins.
   */
  static async logHistory(tenantId: string, guildId: string, memberId: string, inviterId: string | null, code: string | null, isRejoin: boolean) {
    // If inviterId is null (e.g. vanity url or unknown), we just log it for record keeping.
    const now = new Date();
    let joinType: 'new' | 'rejoin' | 'fake' | 'vanity' | 'unknown' = 'new';
    
    if (isRejoin) joinType = 'rejoin';
    else if (inviterId === 'VANITY') joinType = 'vanity';
    else if (!inviterId) joinType = 'unknown';

    return await prisma.invite_histories.create({
      data: {
        tenantId,
        guildId,
        memberId,
        inviterId: inviterId || 'UNKNOWN',
        inviteCode: code || 'UNKNOWN',
        isFake: false, 
        joinType,
        createdAt: now,
        updatedAt: now
      }
    });
  }

  /**
   * Checks if a member has joined the server previously (for rejoin logic).
   */
  static async hasJoinedBefore(tenantId: string, guildId: string, memberId: string) {
    const history = await prisma.invite_histories.findFirst({
      where: { guildId, memberId, tenantId }
    });
    return !!history;
  }

  /**
   * Retrieves the top inviters for a guild based on (joins + bonus - leaves - fake).
   * Note: Since Prisma can't easily order by a computed field across raw integer fields inline, 
   * we fetch top N and sort in memory if the server is large, or use raw SQL.
   * For FBT scale, we fetch all non-zero inviters and sort, or we use raw SQL.
   */
  static async getLeaderboard(tenantId: string, guildId: string, limit: number = 10) {
    const records = await prisma.$queryRaw<any[]>`
      SELECT "userId", "invites", "leaves", "fake", "bonus",
             ("invites" + "bonus" - "leaves" - "fake") as real_invites
      FROM invites
      WHERE "guildId" = ${guildId} AND "tenantId" = ${tenantId}
      ORDER BY real_invites DESC
      LIMIT ${limit}
    `;
    return records.map(r => ({
      userId: r.userId,
      joins: r.invites,
      leaves: r.leaves,
      fake: r.fake,
      bonus: r.bonus,
      realInvites: Number(r.real_invites)
    }));
  }

  /**
   * Retrieves the most recent join history for a member.
   */
  static async getMemberHistory(tenantId: string, guildId: string, memberId: string) {
    return await prisma.invite_histories.findFirst({
      where: { tenantId, guildId, memberId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Fetches the recruiter rank for a user.
   */
  static async getUserRank(tenantId: string, guildId: string, userId: string) {
    const records = await prisma.$queryRaw<any[]>`
      SELECT "userId", ("invites" + "bonus" - "leaves" - "fake") as real_invites
      FROM invites
      WHERE "guildId" = ${guildId} AND "tenantId" = ${tenantId} AND ("invites" + "bonus" - "leaves" - "fake") > 0
      ORDER BY real_invites DESC
    `;
    const index = records.findIndex(r => r.userId === userId);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Fetches the top inviter in the guild.
   */
  static async getTopInviter(tenantId: string, guildId: string) {
    const list = await this.getLeaderboard(tenantId, guildId, 1);
    return list.length > 0 ? list[0] : null;
  }
}
