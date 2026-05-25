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

  /**
   * Fetches all users with patron role for a specific nation.
   * Returns user IDs that have the patron role.
   */
  static async getNationPatrons(guildId: string, nationId: number, guild: any): Promise<{ id: string; username: string; tag: string }[]> {
    try {
      const nation = await prisma.transport_nations.findUnique({
        where: { id: nationId },
      });

      if (!nation || !nation.patronRoleId) return [];

      const role = guild.roles.cache.get(nation.patronRoleId);
      if (!role) return [];

      const patrons = role.members.map((member: any) => ({
        id: member.id,
        username: member.user.username,
        tag: member.user.tag,
      }));

      return patrons;
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetches nation information with patron details.
   */
  static async getNationWithPatrons(guildId: string, nationId: number, guild: any) {
    const nation = await prisma.transport_nations.findUnique({
      where: { id: nationId },
    });

    if (!nation) return null;

    const patrons = await this.getNationPatrons(guildId, nationId, guild);

    return {
      ...nation,
      patrons,
    };
  }

  /**
   * Lists all territories for a guild with patron information.
   */
  static async listByGuildWithPatrons(tenantId: string, guildId: string, guild: any) {
    const nations = await prisma.transport_nations.findMany({
      where: {
        guildId,
        tenantId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const nationsWithPatrons = await Promise.all(
      nations.map(async (nation) => ({
        ...nation,
        patrons: await this.getNationPatrons(guildId, nation.id, guild),
      }))
    );

    return nationsWithPatrons;
  }
}
