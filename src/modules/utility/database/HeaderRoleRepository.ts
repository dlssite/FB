import { prisma } from '../../../database/client';

export class HeaderRoleRepository {
  static async getHeaderRoleIds(tenantId: string, guildId: string): Promise<string[]> {
    const settings = await prisma.welcome_settings.findUnique({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
    });

    if (!settings || !settings.headerRoleIds) {
      return [];
    }

    return Array.isArray(settings.headerRoleIds)
      ? settings.headerRoleIds.filter((id): id is string => typeof id === 'string')
      : [];
  }

  static async setHeaderRoleIds(tenantId: string, guildId: string, headerRoleIds: string[]) {
    const now = new Date();

    return prisma.welcome_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: {
        headerRoleIds,
        updatedAt: now,
      },
      create: {
        guildId,
        tenantId,
        headerRoleIds,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  static async addHeaderRoleId(tenantId: string, guildId: string, roleId: string): Promise<string[]> {
    const current = await this.getHeaderRoleIds(tenantId, guildId);
    if (current.includes(roleId)) return current;

    const next = Array.from(new Set([...current, roleId]));
    await this.setHeaderRoleIds(tenantId, guildId, next);
    return next;
  }

  static async removeHeaderRoleId(tenantId: string, guildId: string, roleId: string): Promise<string[]> {
    const current = await this.getHeaderRoleIds(tenantId, guildId);
    const next = current.filter(id => id !== roleId);
    await this.setHeaderRoleIds(tenantId, guildId, next);
    return next;
  }
}
