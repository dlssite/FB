import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';

export class AutomodRepository {
  /**
   * Fetches automod settings for a guild with Redis caching.
   */
  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:automod:${tenantId}:${guildId}`;
    const cached = await RedisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const settings = await prisma.automod_settings.findUnique({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
    });

    if (settings) {
      await RedisService.set(cacheKey, JSON.stringify(settings), 300);
    }

    return settings;
  }

  /**
   * Updates or creates automod settings.
   */
  static async upsertSettings(tenantId: string, guildId: string, data: any) {
    const now = new Date();
    const result = await prisma.automod_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: {
        ...data,
        updatedAt: now,
      },
      create: {
        guildId,
        tenantId,
        ...data,
        createdAt: now,
        updatedAt: now,
      },
    });

    await this.invalidateCache(tenantId, guildId);
    return result;
  }

  /**
   * Invalidates automod settings cache.
   */
  static async invalidateCache(tenantId: string, guildId: string) {
    await RedisService.del(`settings:automod:${tenantId}:${guildId}`);
  }
}
