import { TenantService } from '../../../services/TenantService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';

/**
 * TenantContextManager
 * Manages tenant context at runtime for modules
 * Provides methods to get the correct tenant for a module or guild
 */
export class TenantContextManager {
  // Cache for module tenant assignments
  private static moduleCache = new Map<string, string>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private static lastCacheUpdate = 0;

  /**
   * Get the active tenant for a specific module
   * Falls back to default tenant if not configured
   */
  static async getModuleTenant(moduleName: string, defaultTenantId?: string): Promise<string> {
    // Check cache first
    if (this.moduleCache.has(moduleName)) {
      return this.moduleCache.get(moduleName)!;
    }

    // Query database
    const tenantId = await TenantService.getModuleTenant(
      moduleName,
      defaultTenantId || flamebornConfig.bot.tenant.id
    );

    if (tenantId) {
      this.moduleCache.set(moduleName, tenantId);
    }

    return tenantId || flamebornConfig.bot.tenant.id;
  }

  /**
   * Get tenant for a guild, with module-specific overrides
   */
  static async getTenantForGuild(guildId: string, moduleName?: string): Promise<string> {
    let tenantId = flamebornConfig.bot.tenant.id;

    // If module-specific, try to get module tenant first
    if (moduleName) {
      tenantId = await this.getModuleTenant(moduleName);
    }

    return tenantId;
  }

  /**
   * Refresh the module cache
   */
  static async refreshModuleCache(): Promise<void> {
    try {
      const moduleMap = await TenantService.getAllModuleMapping();

      this.moduleCache.clear();
      moduleMap.forEach((tenantId, moduleName) => {
        this.moduleCache.set(moduleName, tenantId);
      });

      this.lastCacheUpdate = Date.now();
      Logger.info('Module tenant cache refreshed', 'TENANT_CONTEXT' as any);
    } catch (error) {
      Logger.error('Failed to refresh module cache:', error);
    }
  }

  /**
   * Invalidate a specific module's cache
   */
  static invalidateModuleCache(moduleName: string): void {
    this.moduleCache.delete(moduleName);
  }

  /**
   * Get all cached module assignments
   */
  static getCachedAssignments(): Map<string, string> {
    return new Map(this.moduleCache);
  }

  /**
   * Check if cache needs refresh
   */
  static isCacheExpired(): boolean {
    return Date.now() - this.lastCacheUpdate > this.cacheExpiry;
  }

  /**
   * Set a module's tenant assignment (used when admin changes it)
   */
  static async setModuleTenant(
    moduleName: string,
    tenantId: string,
    isActive: boolean = true
  ): Promise<boolean> {
    try {
      const result = await TenantService.setModuleTenant(moduleName, tenantId, isActive);

      if (result) {
        this.moduleCache.set(moduleName, tenantId);
        return true;
      }

      return false;
    } catch (error) {
      Logger.error(`Failed to set module tenant: ${error}`);
      return false;
    }
  }
}
