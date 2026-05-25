/**
 * Tenant Module Utilities
 * Helper functions for modules to interact with the tenant system
 */

import { TenantContextManager } from '../modules/tenant/services/TenantContextManager';
import { TenantService } from '../services/TenantService';
import { flamebornConfig } from '../config/flameborn.config';
import { Logger } from '../utils/logger';

/**
 * Get the current tenant ID for a module
 * @param moduleName - The name of your module
 * @param options - Additional options
 * @returns The tenant ID for this module
 */
export async function getModuleTenantId(
  moduleName: string,
  options?: { cache?: boolean; timeout?: number }
): Promise<string> {
  try {
    return await TenantContextManager.getModuleTenant(
      moduleName,
      flamebornConfig.bot.tenant.id
    );
  } catch (error) {
    Logger.warn(`Failed to get tenant for module ${moduleName}, using default: ${error}`);
    return flamebornConfig.bot.tenant.id;
  }
}

/**
 * Register a module with the tenant system
 * Should be called once during module initialization
 * @param moduleName - The name of your module
 * @param tenantId - The tenant to register this module with (defaults to current tenant)
 * @param isActive - Whether the module starts active
 */
export async function registerModuleWithTenant(
  moduleName: string,
  tenantId?: string,
  isActive: boolean = true
): Promise<boolean> {
  try {
    const targetTenant = tenantId || flamebornConfig.bot.tenant.id;
    const moduleConfig = flamebornConfig.modules[moduleName];

    if (!moduleConfig) {
      Logger.warn(`Module ${moduleName} not found in config`);
      return false;
    }

    const result = await TenantService.setModuleTenant(
      moduleName,
      targetTenant,
      isActive && moduleConfig.active
    );

    if (result) {
      Logger.info(
        `✅ Registered module ${moduleName} with tenant ${targetTenant}`,
        'TENANT_REGISTRY' as any
      );
      return true;
    }

    return false;
  } catch (error) {
    Logger.error(`Failed to register module ${moduleName}:`, error);
    return false;
  }
}

/**
 * Get all configured modules for a tenant
 * @param tenantId - The tenant ID (defaults to current)
 * @returns List of module names and their status
 */
export async function getTenantModules(tenantId?: string) {
  try {
    const targetTenant = tenantId || flamebornConfig.bot.tenant.id;
    return await TenantService.getTenantModules(targetTenant);
  } catch (error) {
    Logger.error(`Failed to get tenant modules:`, error);
    return [];
  }
}

/**
 * Invalidate the tenant cache for a module
 * Call this when you know the tenant configuration has changed
 * @param moduleName - The module name
 */
export function invalidateModuleCache(moduleName: string): void {
  TenantContextManager.invalidateModuleCache(moduleName);
  Logger.info(`Invalidated cache for module ${moduleName}`, 'TENANT_CONTEXT' as any);
}

/**
 * Refresh all module caches
 * Call this periodically or when you suspect staleness
 */
export async function refreshAllCaches(): Promise<void> {
  try {
    await TenantContextManager.refreshModuleCache();
    Logger.info('All tenant caches refreshed', 'TENANT_CONTEXT' as any);
  } catch (error) {
    Logger.error('Failed to refresh caches:', error);
  }
}

/**
 * Check if a module is active for a tenant
 * @param moduleName - The module name
 * @param tenantId - The tenant ID (optional)
 * @returns true if the module is active
 */
export async function isModuleActive(moduleName: string, tenantId?: string): Promise<boolean> {
  try {
    const targetTenant = tenantId || flamebornConfig.bot.tenant.id;
    const modules = await TenantService.getTenantModules(targetTenant);
    const moduleConfig = modules.find(m => m.moduleName === moduleName);
    return moduleConfig?.isActive || false;
  } catch (error) {
    Logger.warn(`Failed to check if module ${moduleName} is active: ${error}`);
    return false;
  }
}

/**
 * Log a module action for audit trail
 * @param moduleName - The module name
 * @param actionType - Type of action: "activated", "deactivated", "configured", "error"
 * @param userId - Optional user ID who triggered the action
 * @param details - Optional details about the action
 */
export async function logModuleAction(
  moduleName: string,
  actionType: string,
  userId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const tenantId = await getModuleTenantId(moduleName);
    await TenantService.logModuleActivity(tenantId, moduleName, actionType, userId, details);
  } catch (error) {
    Logger.warn(`Failed to log module action: ${error}`);
  }
}

/**
 * Get module statistics across all tenants
 * @returns Map of module name to { active: number, inactive: number, tenants: Set }
 */
export async function getModuleStats() {
  try {
    return await TenantService.getModuleStatistics();
  } catch (error) {
    Logger.error('Failed to get module statistics:', error);
    return new Map();
  }
}

/**
 * Create a module initializer function
 * Use this pattern in your module's startup code:
 *
 * @example
 * ```typescript
 * export const initialize = createModuleInitializer('mymodule');
 *
 * // In your startup code:
 * await initialize({
 *   tenantId: 'custom-tenant',
 *   autoRegister: true,
 * });
 * ```
 */
export function createModuleInitializer(moduleName: string) {
  return async (options?: { tenantId?: string; autoRegister?: boolean }) => {
    Logger.info(`Initializing tenant context for module: ${moduleName}`, 'MODULE_INIT' as any);

    if (options?.autoRegister) {
      const registered = await registerModuleWithTenant(moduleName, options.tenantId);
      if (!registered) {
        Logger.warn(`Failed to register module ${moduleName} with tenant system`);
      }
    }

    const tenantId = await getModuleTenantId(moduleName);
    Logger.info(
      `Module ${moduleName} initialized with tenant: ${tenantId}`,
      'MODULE_INIT' as any
    );

    return { moduleName, tenantId };
  };
}
