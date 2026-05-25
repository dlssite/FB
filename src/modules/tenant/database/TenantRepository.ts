import { prisma } from '../../../database/client';

/**
 * TenantRepository
 * Data access layer for tenant operations
 * Provides database queries and mutations for tenant management
 */
export class TenantRepository {
  /**
   * Get a tenant by ID
   */
  static async getTenantById(tenantId: string) {
    return await prisma.tenants.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Get all tenants
   */
  static async getAllTenants() {
    return await prisma.tenants.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get tenants by owner ID
   */
  static async getTenantsByOwner(ownerId: string) {
    return await prisma.tenants.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new tenant
   */
  static async createTenant(tenantId: string, name: string, ownerId?: string) {
    return await prisma.tenants.create({
      data: {
        tenantId,
        name,
        ownerId: ownerId || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update tenant details
   */
  static async updateTenant(tenantId: string, data: any) {
    return await prisma.tenants.update({
      where: { tenantId },
      data,
    });
  }

  /**
   * Delete a tenant
   */
  static async deleteTenant(tenantId: string) {
    return await prisma.tenants.delete({
      where: { tenantId },
    });
  }

  /**
   * Map a guild to a tenant
   */
  static async mapGuildToTenant(guildId: string, tenantId: string) {
    return await prisma.guild_tenant_map.upsert({
      where: { guildId },
      create: {
        guildId,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        tenantId,
      },
    });
  }

  /**
   * Get tenant for a guild
   */
  static async getTenantForGuild(guildId: string) {
    return await prisma.guild_tenant_map.findUnique({
      where: { guildId },
    });
  }

  /**
   * Get all guilds for a tenant
   */
  static async getGuildsForTenant(tenantId: string) {
    return await prisma.guild_tenant_map.findMany({
      where: { tenantId },
    });
  }

  /**
   * Check if a guild is mapped to a tenant
   */
  static async isGuildMapped(guildId: string): Promise<boolean> {
    const mapping = await prisma.guild_tenant_map.findUnique({
      where: { guildId },
    });
    return !!mapping;
  }
}
