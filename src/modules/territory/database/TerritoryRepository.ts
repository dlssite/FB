import { prisma } from '../../../database/client';

export interface TerritoryConfig {
  name: string;
  categoryId: string;
  roleId: string;
  logChannelId?: string;
  arrivalChannelId?: string;
  banRoleId?: string;
  patronRoleId?: string;
  imageUrl?: string;
  resourceName?: string;
  resourceBasePrice?: number;
  description?: string;
}

export class TerritoryRepository {
  /**
   * Fetches a territory by its associated Category ID.
   */
  static async getByCategoryId(tenantId: string, guildId: string, categoryId: string) {
    return await prisma.transport_nations.findUnique({
      where: {
        guildId_categoryId_tenantId: {
          guildId,
          categoryId,
          tenantId,
        },
      },
    });
  }

  /**
   * Lists all territories for a guild.
   */
  static async listByGuild(tenantId: string, guildId: string) {
    return await prisma.transport_nations.findMany({
      where: {
        guildId,
        tenantId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Registers or updates a territory.
   */
  static async upsertTerritory(tenantId: string, guildId: string, config: TerritoryConfig) {
    return await prisma.transport_nations.upsert({
      where: {
        guildId_categoryId_tenantId: {
          guildId,
          categoryId: config.categoryId,
          tenantId,
        },
      },
      update: {
        name: config.name,
        roleId: config.roleId,
        logChannelId: config.logChannelId,
        arrivalChannelId: config.arrivalChannelId,
        banRoleId: config.banRoleId,
        patronRoleId: config.patronRoleId,
        imageUrl: config.imageUrl,
        resourceName: config.resourceName,
        resourceBasePrice: config.resourceBasePrice,
        description: config.description,
        updatedAt: new Date(),
      },
      create: {
        guildId,
        tenantId,
        name: config.name,
        categoryId: config.categoryId,
        roleId: config.roleId,
        logChannelId: config.logChannelId,
        arrivalChannelId: config.arrivalChannelId,
        banRoleId: config.banRoleId,
        patronRoleId: config.patronRoleId,
        imageUrl: config.imageUrl,
        resourceName: config.resourceName,
        resourceBasePrice: config.resourceBasePrice,
        description: config.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Removes a territory registration.
   */
  static async removeTerritory(tenantId: string, guildId: string, categoryId: string) {
    return await prisma.transport_nations.delete({
      where: {
        guildId_categoryId_tenantId: {
          guildId,
          categoryId,
          tenantId,
        },
      },
    });
  }
}
