import { prisma } from '../database/client';

export class TenantRepository {
  // Simple in-memory cache to avoid redundant DB lookups on every interaction
  private static mappingCache = new Map<string, string>();

  /**
   * Finds which tenant owns a specific guild.
   * Checks local cache first, then the database.
   */
  static async getTenantForGuild(guildId: string): Promise<string | null> {
    // 1. Check cache
    if (this.mappingCache.has(guildId)) {
      return this.mappingCache.get(guildId)!;
    }

    // 2. Check Database
    try {
      const mapping = await prisma.guild_tenant_map.findUnique({
        where: { guildId },
        select: { tenantId: true }
      });

      if (mapping) {
        this.mappingCache.set(guildId, mapping.tenantId);
        return mapping.tenantId;
      }
    } catch (error) {
      console.error(`[TenantRepo] Error resolving tenant for ${guildId}:`, error);
    }

    return null;
  }

  /**
   * Clears the cache for a specific guild (useful when Mothership updates a mapping)
   */
  static invalidateCache(guildId: string) {
    this.mappingCache.delete(guildId);
  }
}
