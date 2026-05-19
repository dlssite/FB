import { prisma } from '../database/client';
import { TenantRepository } from '../repositories/TenantRepository';
import { RedisService } from './RedisService';
import { Logger } from '../utils/logger';

// Ultra-fast local cache for routing to prevent Redis overhead during autocompletes
const routingCache = new Map<string, { tenantId: string, timestamp: number }>();

export class RoutingService {
  /**
   * Resolves the correct tenantId for a specific addon in a specific guild.
   * Priority: 
   * 1. Module-level override in fleet_routing_rules
   * 2. Guild-level mapping in guild_tenant_map
   * 3. Bot-level default in .env
   */
  static async resolveTenantId(guildId: string | null | undefined, moduleName: string): Promise<string> {
    if (!guildId) {
      return process.env.TENANT_ID || 'tenant_alpha_01';
    }
    const botId = process.env.FLAMEBORN_ID || 'Proto Bot';
    const cacheKey = `routing:${guildId}:${botId}:${moduleName.toLowerCase()}`;

    // 0. Check L1 Local Cache (Ultra Fast)
    const local = routingCache.get(cacheKey);
    if (local && (Date.now() - local.timestamp) < 60000) {
      return local.tenantId;
    }

    // 1. Check Redis Cache
    const cached = await RedisService.get(cacheKey);
    if (cached) {
      routingCache.set(cacheKey, { tenantId: cached, timestamp: Date.now() });
      return cached;
    }

    try {
      // 2. Check Module-level Routing Matrix
      const rule = await prisma.fleet_routing_rules.findUnique({
        where: {
          guildId_botId_addonName: {
            guildId,
            botId,
            addonName: moduleName.toLowerCase()
          }
        }
      });

      if (rule && rule.isEnabled) {
        await RedisService.set(cacheKey, rule.tenantId, 3600); // 1 hour cache
        routingCache.set(cacheKey, { tenantId: rule.tenantId, timestamp: Date.now() });
        return rule.tenantId;
      }

      // 3. Fallback to Guild-level Mapping
      const guildTenant = await TenantRepository.getTenantForGuild(guildId);
      if (guildTenant) {
        await RedisService.set(cacheKey, guildTenant, 3600);
        routingCache.set(cacheKey, { tenantId: guildTenant, timestamp: Date.now() });
        return guildTenant;
      }
    } catch (err) {
      Logger.error(`[RoutingService] Error resolving routing for ${moduleName}`, err);
    }

    // 4. Ultimate Fallback: Bot native tenant
    const fallback = process.env.TENANT_ID || 'tenant_alpha_01';
    await RedisService.set(cacheKey, fallback, 3600);
    routingCache.set(cacheKey, { tenantId: fallback, timestamp: Date.now() });
    return fallback;
  }

  /**
   * Invalidates routing cache for a specific guild globally
   */
  static async invalidateCache(guildId: string) {
    const keys = await RedisService.client.keys(`routing:${guildId}:*`);
    if (keys.length > 0) {
      await RedisService.client.del(...keys);
    }
    // Also clear local cache for this guild
    for (const key of routingCache.keys()) {
      if (key.startsWith(`routing:${guildId}:`)) {
        routingCache.delete(key);
      }
    }
  }
}
