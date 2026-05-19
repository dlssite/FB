import { prisma } from '../../../database/client';

export class StreakRepository {
  /**
   * Fetches or creates streak settings for a guild.
   */
  static async getSettings(tenantId: string, guildId: string) {
    let settings = await prisma.streak_settings.findUnique({
      where: { guildId_tenantId: { guildId, tenantId } }
    });

    if (!settings) {
      settings = await prisma.streak_settings.create({
        data: { guildId, tenantId }
      });
    }
    return settings;
  }

  /**
   * Fetches a user's streak profile.
   */
  static async getUser(tenantId: string, guildId: string, userId: string) {
    return await prisma.streak_users.upsert({
      where: {
        userId_guildId_tenantId: { userId, guildId, tenantId }
      },
      update: {},
      create: {
        userId,
        guildId,
        tenantId,
      }
    });
  }

  /**
   * Updates a user's streak.
   */
  static async updateStreak(
    tenantId: string,
    guildId: string,
    userId: string,
    data: { currentStreak?: number; longestStreak?: number; freezesUsed?: { increment: number }; lastClaimedAt?: Date }
  ) {
    return await prisma.streak_users.update({
      where: {
        userId_guildId_tenantId: { userId, guildId, tenantId }
      },
      data
    });
  }

  /**
   * Gets the top streakers in a guild.
   */
  static async getTopStreaks(tenantId: string, guildId: string, limit: number = 10) {
    return await prisma.streak_users.findMany({
      where: {
        guildId,
        tenantId,
        currentStreak: { gt: 0 }
      },
      orderBy: { currentStreak: 'desc' },
      take: limit
    });
  }

  /**
   * Fetches the streak rank for a user.
   */
  static async getUserRank(tenantId: string, guildId: string, userId: string) {
    const users = await prisma.streak_users.findMany({
      where: { guildId, tenantId, currentStreak: { gt: 0 } },
      orderBy: { currentStreak: 'desc' }
    });
    const index = users.findIndex(u => u.userId === userId);
    return index >= 0 ? index + 1 : 0;
  }
}
