import { prisma } from '../database/client';
import { flamebornConfig } from '../config/flameborn.config';
import { Logger } from '../utils/logger';

export interface TenantInfo {
  tenantId: string;
  name: string;
  ownerId: string | undefined;
  guildCount: number;
  moduleCount: number;
  createdAt: Date;
  updatedAt: Date;
  details?: {
    description: string | undefined;
    isVerified: boolean;
    isPremium: boolean;
    totalUsers: number;
  };
}

export interface ModuleStatus {
  moduleName: string;
  isActive: boolean;
  tenantId: string;
  config?: Record<string, any>;
}

export class TenantService {
  static async ensureTenant() {
    const tenantId = flamebornConfig.bot.tenant.id;
    const name = flamebornConfig.bot.tenant.name;

    Logger.info(`Ensuring tenant exists: ${tenantId} (${name})...`, 'TENANT' as any);

    try {
      const tenant = await prisma.tenants.upsert({
        where: { tenantId },
        update: { name },
        create: {
          tenantId,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Ensure tenant details exist
      await prisma.tenant_details.upsert({
        where: { tenantId },
        update: {},
        create: {
          tenantId,
          description: `Tenant for ${name}`,
          isVerified: true,
          isPremium: false,
        },
      });

      Logger.info(`Verified tenant: ${tenant.name}`, 'TENANT' as any);
      return tenant;
    } catch (error) {
      Logger.error(`Failed to ensure tenant:`, error);
      throw error;
    }
  }

  /**
   * List all tenants in the database
   */
  static async listAllTenants(): Promise<TenantInfo[]> {
    try {
      const tenants = await prisma.tenants.findMany({
        include: {
          tenant_details: true,
          module_tenant_configs: true,
          guild_tenant_map: true,
        },
      });

      return tenants.map(t => ({
        tenantId: t.tenantId,
        name: t.name,
        ownerId: t.ownerId ?? undefined,
        guildCount: t.guild_tenant_map.length,
        moduleCount: t.module_tenant_configs.filter((m: any) => m.isActive).length,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        details: t.tenant_details
          ? {
              description: t.tenant_details.description ?? undefined,
              isVerified: t.tenant_details.isVerified,
              isPremium: t.tenant_details.isPremium,
              totalUsers: t.tenant_details.totalUsers,
            }
          : undefined,
      }));
    } catch (error) {
      Logger.error('Failed to list tenants:', error);
      return [];
    }
  }

  /**
   * Get detailed tenant information
   */
  static async getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
    try {
      const tenant = await prisma.tenants.findUnique({
        where: { tenantId },
        include: {
          tenant_details: true,
          module_tenant_configs: true,
          guild_tenant_map: true,
        },
      });

      if (!tenant) return null;

      return {
        tenantId: tenant.tenantId,
        name: tenant.name,
        ownerId: tenant.ownerId ?? undefined,
        guildCount: tenant.guild_tenant_map.length,
        moduleCount: tenant.module_tenant_configs.filter((m: any) => m.isActive).length,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        details: tenant.tenant_details
          ? {
              description: tenant.tenant_details.description ?? undefined,
              isVerified: tenant.tenant_details.isVerified,
              isPremium: tenant.tenant_details.isPremium,
              totalUsers: tenant.tenant_details.totalUsers,
            }
          : undefined,
      };
    } catch (error) {
      Logger.error(`Failed to get tenant info for ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get all modules configured for a specific tenant
   */
  static async getTenantModules(tenantId: string): Promise<ModuleStatus[]> {
    try {
      const configs = await prisma.module_tenant_config.findMany({
        where: { tenantId },
      });

      return configs.map(c => ({
        moduleName: c.moduleName,
        isActive: c.isActive,
        tenantId: c.tenantId,
        config: c.config as Record<string, any> | undefined,
      }));
    } catch (error) {
      Logger.error(`Failed to get modules for tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Set a module's tenant and status
   */
  static async setModuleTenant(
    moduleName: string,
    tenantId: string,
    isActive: boolean = true,
    config?: Record<string, any>
  ): Promise<ModuleStatus | null> {
    try {
      const result = await prisma.module_tenant_config.upsert({
        where: {
          moduleName_tenantId: {
            moduleName,
            tenantId,
          },
        },
        update: {
          isActive,
          config: config || undefined,
          updatedAt: new Date(),
        },
        create: {
          moduleName,
          tenantId,
          isActive,
          config: config || undefined,
        },
      });

      // Log the action
      await this.logModuleActivity(tenantId, moduleName, 'configured', undefined, {
        isActive,
        config,
      });

      return {
        moduleName: result.moduleName,
        isActive: result.isActive,
        tenantId: result.tenantId,
        config: result.config as Record<string, any> | undefined,
      };
    } catch (error) {
      Logger.error(`Failed to set module tenant for ${moduleName}:`, error);
      return null;
    }
  }

  /**
   * Get the tenant for a specific module
   */
  static async getModuleTenant(moduleName: string, defaultTenantId?: string): Promise<string | null> {
    try {
      const config = await prisma.module_tenant_config.findFirst({
        where: {
          moduleName,
          isActive: true,
        },
      });

      return config?.tenantId || defaultTenantId || null;
    } catch (error) {
      Logger.error(`Failed to get tenant for module ${moduleName}:`, error);
      return defaultTenantId || null;
    }
  }

  /**
   * Get all active modules (across all tenants)
   */
  static async getAllModuleMapping(): Promise<Map<string, string>> {
    try {
      const configs = await prisma.module_tenant_config.findMany({
        where: { isActive: true },
      });

      const map = new Map<string, string>();
      configs.forEach(c => {
        map.set(c.moduleName, c.tenantId);
      });

      return map;
    } catch (error) {
      Logger.error('Failed to get all module mappings:', error);
      return new Map();
    }
  }

  /**
   * Update tenant details
   */
  static async updateTenantDetails(
    tenantId: string,
    details: {
      description?: string;
      isVerified?: boolean;
      isPremium?: boolean;
      customization?: Record<string, any>;
    }
  ) {
    try {
      return await prisma.tenant_details.upsert({
        where: { tenantId },
        update: {
          description: details.description,
          isVerified: details.isVerified,
          isPremium: details.isPremium,
          customization: details.customization,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          description: details.description,
          isVerified: details.isVerified ?? false,
          isPremium: details.isPremium ?? false,
          customization: details.customization,
        },
      });
    } catch (error) {
      Logger.error(`Failed to update tenant details for ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Log module activity for audit trails
   */
  static async logModuleActivity(
    tenantId: string,
    moduleName: string,
    actionType: string,
    userId?: string,
    details?: Record<string, any>
  ) {
    try {
      await prisma.tenant_module_activity.create({
        data: {
          tenantId,
          moduleName,
          actionType,
          userId,
          details: details || undefined,
        },
      });
    } catch (error) {
      Logger.warn(`Failed to log module activity: ${error}`);
    }
  }

  /**
   * Get module activity history
   */
  static async getModuleActivityHistory(
    tenantId: string,
    moduleName?: string,
    limit: number = 50
  ) {
    try {
      return await prisma.tenant_module_activity.findMany({
        where: {
          tenantId,
          ...(moduleName && { moduleName }),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      Logger.error(`Failed to get activity history for tenant ${tenantId}:`, error);
      return [];
    }
  }

  /**
   * Create a new tenant
   */
  static async createTenant(
    tenantId: string,
    name: string,
    ownerId?: string,
    description?: string
  ) {
    try {
      const tenant = await prisma.tenants.create({
        data: {
          tenantId,
          name,
          ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create tenant details
      await prisma.tenant_details.create({
        data: {
          tenantId,
          description,
          isVerified: false,
          isPremium: false,
        },
      });

      return tenant;
    } catch (error) {
      Logger.error(`Failed to create tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get module statistics across all tenants
   */
  static async getModuleStatistics() {
    try {
      const allConfigs = await prisma.module_tenant_config.findMany();

      const stats = new Map<string, { active: number; inactive: number; tenants: Set<string> }>();

      allConfigs.forEach(config => {
        const existing = stats.get(config.moduleName) || {
          active: 0,
          inactive: 0,
          tenants: new Set<string>(),
        };

        if (config.isActive) {
          existing.active++;
        } else {
          existing.inactive++;
        }
        existing.tenants.add(config.tenantId);

        stats.set(config.moduleName, existing);
      });

      return stats;
    } catch (error) {
      Logger.error('Failed to get module statistics:', error);
      return new Map();
    }
  }
}
