import { prisma } from '../database/client';
import { WelcomeRepository } from '../modules/welcomer/database/WelcomeRepository';
import { AutomodRepository } from '../modules/automod/database/AutomodRepository';
import { flamebornConfig } from '../config/flameborn.config';

export type AddonStatus = {
  enabled: boolean;
  reason?: 'ADMIN' | 'MOTHER' | 'OPERATOR';
};

export class AddonService {
  /**
   * Universal check to see if a specific module is enabled for a guild.
   * Checks Static Config, Mothership, and Local Admin layers.
   */
  static async checkStatus(tenantId: string, guildId: string, moduleName: string): Promise<AddonStatus> {
    try {
      // 0. Layer 0: Static Bot Config (Operator)
      const config = (flamebornConfig.modules as any)[moduleName.toLowerCase()];
      if (config && config.active === false) {
        return { enabled: false, reason: 'OPERATOR' };
      }

      // 1. Layer 1: Mothership (Fleet Routing & Hard Locks)
      // Check for server-specific locks in guild_tenant_map
      const guildMapping = await prisma.guild_tenant_map.findUnique({
        where: { guildId },
        select: { forceDisabledAddons: true, tenantId: true }
      });

      const parseLocks = (val: any): string[] => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch { return []; }
        }
        return [];
      };

      const guildLocks = parseLocks(guildMapping?.forceDisabledAddons);
      
      // Check for global tenant locks in BOTH the routed tenant AND the native guild tenant
      const tenantsToQuery = Array.from(new Set([tenantId, guildMapping?.tenantId].filter(Boolean) as string[]));
      const tenantResults = await prisma.tenants.findMany({
        where: { tenantId: { in: tenantsToQuery } },
        select: { forceDisabledAddons: true }
      });

      const tenantLocks = tenantResults.flatMap(t => parseLocks(t.forceDisabledAddons));
      const allLocks = new Set([...guildLocks, ...tenantLocks]);

      if (allLocks.has(moduleName.toLowerCase())) {
        return { enabled: false, reason: 'MOTHER' };
      }

      // 2. Layer 2: Local Admin Settings (Server Owner)
      const settings = await prisma.server_settings.findUnique({
        where: { guildId_tenantId: { guildId, tenantId } }
      });

      if (settings) {
        // 2a. Check the unified disabledAddons list (preferred)
        const localLocks = parseLocks(settings.disabledAddons);
        if (localLocks.includes(moduleName.toLowerCase())) {
          return { enabled: false, reason: 'ADMIN' };
        }

        // 2b. Legacy Fallback: Individual boolean flags
        switch (moduleName.toLowerCase()) {
          case 'welcomer':
            if (settings.welcomeInOn === false) return { enabled: false, reason: 'ADMIN' };
            break;
          case 'automod':
            if (settings.antiInviteOn === false && settings.antiLinkOn === false) {
               // If all automod sub-features are off, consider it off
            }
            break;
          case 'leveling':
            if (settings.levelingOn === false) return { enabled: false, reason: 'ADMIN' };
            break;
        }
      }

      return { enabled: true };
    } catch (err) {
      console.error(`[AddonService] Status check failed for ${moduleName}:`, err);
      return { enabled: true };
    }
  }

  // Legacy support for boolean checks
  static async isEnabled(tenantId: string, guildId: string, moduleName: string): Promise<boolean> {
    const status = await this.checkStatus(tenantId, guildId, moduleName);
    return status.enabled;
  }
}
