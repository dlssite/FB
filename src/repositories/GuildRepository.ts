import { prisma } from '../database/client';

export class GuildRepository {
  static async getGuildSettings(tenantId: string, guildId: string) {
    return await prisma.server_settings.findUnique({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
    });
  }

  static async upsertGuildSettings(tenantId: string, guildId: string, prefix: string = '!') {
    const now = new Date();
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { prefix },
      create: {
        guildId,
        tenantId,
        prefix,
      },
    });
  }

  static async updateDisabledAddons(tenantId: string, guildId: string, disabledAddons: string[]) {
    const now = new Date();
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { disabledAddons },
      create: {
        guildId,
        tenantId,
        disabledAddons,
      },
    });
  }

  static async updateMiningRole(tenantId: string, guildId: string, roleId: string) {
    const now = new Date();
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { miningRoleId: roleId },
      create: {
        guildId,
        tenantId,
        miningRoleId: roleId,
      },
    });
  }

  static async updateRichestRole(tenantId: string, guildId: string, roleId: string) {
    const now = new Date();
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { richestRoleId: roleId },
      create: {
        guildId,
        tenantId,
        richestRoleId: roleId,
      },
    });
  }

  static async updateTopLevelerRole(tenantId: string, guildId: string, roleId: string) {
    const now = new Date();
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { topLevelerRoleId: roleId },
      create: {
        guildId,
        tenantId,
        topLevelerRoleId: roleId,
      },
    });
  }

  static async updateInviteChannel(tenantId: string, guildId: string, channelId: string) {
    const now = new Date();
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { inviteChannelId: channelId },
      create: {
        guildId,
        tenantId,
        inviteChannelId: channelId,
      },
    });
  }

  static async updateBotAllowedRoles(tenantId: string, guildId: string, roleIds: string[]) {
    return await prisma.server_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: { botAllowedRoleIds: roleIds },
      create: {
        guildId,
        tenantId,
        botAllowedRoleIds: roleIds,
      },
    });
  }
}
