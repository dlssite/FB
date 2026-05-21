import { GuildRepository } from '../repositories/GuildRepository';
import { prisma } from '../database/client';
import { RedisService } from './RedisService';

const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

export class GuildService {
  private static CACHE_TTL = 300; // 5 minutes

  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:${tenantId}:${guildId}`;
    const cached = await RedisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    let settings = await GuildRepository.getGuildSettings(tenantId, guildId);
    
    // 2. Fetch Mothership locks (forceDisabledAddons)
    const [guildMapping, tenant] = await Promise.all([
      prisma.guild_tenant_map.findUnique({
        where: { guildId },
        select: { forceDisabledAddons: true }
      }),
      prisma.tenants.findUnique({
        where: { tenantId },
        select: { forceDisabledAddons: true }
      })
    ]);

    const parseLocks = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch { return []; }
      }
      return [];
    };

    const forceDisabledAddons = Array.from(new Set([
      ...parseLocks(guildMapping?.forceDisabledAddons),
      ...parseLocks(tenant?.forceDisabledAddons)
    ]));

    // Auto-initialize if it doesn't exist
    if (!settings) {
      settings = await GuildRepository.upsertGuildSettings(tenantId, guildId);
    }

    // Merge locks into settings object so the dashboard sees them
    const enrichedSettings = {
      ...(serialize(settings)), // Ensure we handle BigInt if any
      forceDisabledAddons
    };

    // Save to Redis
    await RedisService.set(cacheKey, JSON.stringify(enrichedSettings), this.CACHE_TTL);
    
    return enrichedSettings;
  }

  static async updateDisabledAddons(tenantId: string, guildId: string, disabledAddons: string[]) {
    const result = await GuildRepository.updateDisabledAddons(tenantId, guildId, disabledAddons);

    // Invalidate cache immediately on update
    this.invalidateCache(guildId);

    return result;
  }

  static async updatePrefix(tenantId: string, guildId: string, prefix: string) {
    if (prefix.length > 5) throw new Error('Prefix too long (max 5 chars)');
    const result = await GuildRepository.upsertGuildSettings(tenantId, guildId, prefix);
    await this.invalidateCache(guildId);
    return result;
  }

  static async updateMiningRole(tenantId: string, guildId: string, roleId: string) {
    const result = await GuildRepository.updateMiningRole(tenantId, guildId, roleId);
    this.invalidateCache(guildId);
    return result;
  }

  static async updateRichestRole(tenantId: string, guildId: string, roleId: string) {
    const result = await GuildRepository.updateRichestRole(tenantId, guildId, roleId);
    this.invalidateCache(guildId);
    return result;
  }

  static async updateTopLevelerRole(tenantId: string, guildId: string, roleId: string) {
    const result = await GuildRepository.updateTopLevelerRole(tenantId, guildId, roleId);
    this.invalidateCache(guildId);
    return result;
  }

  static async updateInviteChannel(tenantId: string, guildId: string, channelId: string) {
    const result = await GuildRepository.updateInviteChannel(tenantId, guildId, channelId);
    this.invalidateCache(guildId);
    return result;
  }

  static async getAllGuildSettings() {
    return await prisma.server_settings.findMany();
  }

  static async invalidateCache(guildId: string) {
    const keys = await RedisService.client.keys(`settings:*:${guildId}`);
    if (keys.length > 0) {
      await RedisService.client.del(...keys);
    }
  }
}
