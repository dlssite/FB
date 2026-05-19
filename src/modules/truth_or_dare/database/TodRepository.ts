import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';

export class TodRepository {
  /**
   * Fetches or creates ToD settings for a guild.
   */
  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:tod:${tenantId}:${guildId}`;
    const cached = await RedisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const settings = await prisma.tod_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: {},
      create: { guildId, tenantId, maxIntensity: 'SOFT' }
    });

    await RedisService.set(cacheKey, JSON.stringify(settings), 3600); // 1 hour cache
    return settings;
  }

  /**
   * Updates ToD settings.
   */
  static async updateSettings(tenantId: string, guildId: string, data: any) {
    const settings = await prisma.tod_settings.update({
      where: { guildId_tenantId: { guildId, tenantId } },
      data
    });

    const cacheKey = `settings:tod:${tenantId}:${guildId}`;
    await RedisService.del(cacheKey);
    return settings;
  }

  /**
   * Gets a user's player stats.
   */
  static async getPlayerStats(userId: string, tenantId: string) {
    return await prisma.tod_player_stats.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: {},
      create: { userId, tenantId }
    });
  }

  /**
   * Increments player stats (Truths, Dares, Points, etc).
   */
  static async incrementStats(userId: string, tenantId: string, field: 'truthsAnswered' | 'daresCompleted' | 'chickens', points: number = 0) {
    return await prisma.tod_player_stats.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: {
        [field]: { increment: 1 },
        bravePoints: { increment: points },
        updatedAt: new Date()
      },
      create: {
        userId,
        tenantId,
        [field]: 1,
        bravePoints: points
      }
    });
  }
}
