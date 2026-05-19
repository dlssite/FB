import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';

export class LevelingRepository {
  /**
   * Fetch a user's global XP record.
   */
  static async getUser(tenantId: string, guildId: string, userId: string) {
    return await prisma.users.findFirst({
      where: {
        userId,
        guildId,
        tenantId,
      },
    });
  }

  /**
   * Update a user's XP and Level.
   */
  static async updateXp(tenantId: string, guildId: string, userId: string, xp: number, level: number) {
    // We use findFirst + update since the 'users' model @@id is not [userId, guildId, tenantId] 
    // but the model has those fields.
    const user = await this.getUser(tenantId, guildId, userId);
    
    if (!user) {
      return await prisma.users.create({
        data: {
          tenantId,
          guildId,
          userId,
          xp,
          level,
        }
      });
    }

    return await prisma.users.update({
      where: { id: user.id },
      data: {
        xp,
        level,
        lastMessage: new Date(),
      },
    });
  }

  /**
   * Fetch leveling settings for a guild with Redis caching.
   */
  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:leveling:${tenantId}:${guildId}`;
    const cached = await RedisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const settings = await prisma.leveling_settings.findUnique({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
    });

    if (settings) {
      await RedisService.set(cacheKey, JSON.stringify(settings), 300); // 5 min cache
    }

    return settings;
  }

  /**
   * Initialize default settings for a guild.
   */
  static async initSettings(tenantId: string, guildId: string) {
    const settings = await prisma.leveling_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: {},
      create: {
        guildId,
        tenantId,
        messageXpEnabled: true,
        messageXpMin: 15,
        messageXpMax: 25,
        messageXpCooldown: 60,
        levelingMultiplier: 1.0,
        roleRewardStack: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.invalidateCache(tenantId, guildId);
    return settings;
  }

  /**
   * Invalidates leveling settings cache.
   */
  static async invalidateCache(tenantId: string, guildId: string) {
    await RedisService.del(`settings:leveling:${tenantId}:${guildId}`);
  }

  /**
   * Leaderboard: Top Levelers.
   */
  static async getTopLevelers(tenantId: string, guildId: string, limit: number = 10) {
    return await prisma.users.findMany({
      where: { tenantId, guildId },
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' }
      ],
      take: limit,
    });
  }

  /**
   * Get a user's current rank position.
   */
  static async getUserRank(tenantId: string, guildId: string, userId: string) {
    // This is a simple but effective way to get rank: 
    // Count how many users have more Level/XP than this user.
    const user = await this.getUser(tenantId, guildId, userId);
    if (!user) return 0;

    const higherCount = await prisma.users.count({
      where: {
        tenantId,
        guildId,
        OR: [
          { level: { gt: user.level || 0 } },
          { 
            AND: [
              { level: user.level || 0 },
              { xp: { gt: user.xp || 0 } }
            ]
          }
        ]
      }
    });

    return higherCount + 1;
  }
}
