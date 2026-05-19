import { prisma } from '../../../database/client';

export class VerificationRepository {
  /**
   * Retrieves verification settings for a specific tenant and guild
   */
  static async getSettings(tenantId: string, guildId: string) {
    return await prisma.verification_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: {},
      create: {
        guildId,
        tenantId,
        enabled: false,
      },
    });
  }

  /**
   * Updates verification settings
   */
  static async updateSettings(tenantId: string, guildId: string, data: any) {
    return await prisma.verification_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: data,
      create: {
        guildId,
        tenantId,
        ...data,
      },
    });
  }

  /**
   * Retrieves all role groups for a guild
   */
  static async getGroups(tenantId: string, guildId: string) {
    return await prisma.verification_groups.findMany({
      where: {
        guildId,
        tenantId,
      },
      include: {
        roles: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Creates a role group
   */
  static async createGroup(tenantId: string, guildId: string, name: string, description?: string, headerRoleId?: string, minSelect: number = 0, maxSelect: number = 1) {
    return await prisma.verification_groups.create({
      data: {
        tenantId,
        guildId,
        name,
        description,
        headerRoleId,
        minSelect,
        maxSelect,
      },
    });
  }

  /**
   * Adds a role to a group
   */
  static async addRoleToGroup(groupId: number, roleId: string, label: string, emoji?: string, description?: string) {
    return await prisma.verification_roles.create({
      data: {
        groupId,
        roleId,
        label,
        emoji,
        description,
      },
    });
  }

  /**
   * Deletes a role from a group
   */
  static async deleteRole(roleId: number) {
    return await prisma.verification_roles.delete({
      where: { id: roleId },
    });
  }

  /**
   * Deletes a group and all its roles
   */
  static async deleteGroup(groupId: number) {
    return await prisma.verification_groups.delete({
      where: { id: groupId },
    });
  }

  /**
   * Fetches a group by ID
   */
  static async getGroupById(groupId: number) {
    return await prisma.verification_groups.findUnique({
      where: { id: groupId },
      include: { roles: true }
    });
  }

  /**
   * Role Backups: Saves a user's roles
   */
  static async saveBackup(tenantId: string, guildId: string, userId: string, roleIds: string[]) {
    return await prisma.verification_backups.upsert({
      where: {
        userId_guildId_tenantId: {
          userId,
          guildId,
          tenantId,
        },
      },
      update: { roleIds: JSON.stringify(roleIds) },
      create: {
        userId,
        guildId,
        tenantId,
        roleIds: JSON.stringify(roleIds),
      },
    });
  }

  /**
   * Role Backups: Retrieves a user's roles
   */
  static async getBackup(tenantId: string, guildId: string, userId: string) {
    const backup = await prisma.verification_backups.findUnique({
      where: {
        userId_guildId_tenantId: {
          userId,
          guildId,
          tenantId,
        },
      },
    });

    if (!backup) return null;
    return JSON.parse(backup.roleIds) as string[];
  }

  /**
   * Role Backups: Deletes a backup
   */
  static async deleteBackup(tenantId: string, guildId: string, userId: string) {
    return await prisma.verification_backups.deleteMany({
      where: {
        userId,
        guildId,
        tenantId,
      },
    });
  }

  /**
   * Access Codes: Retrieves all valid codes for a guild
   */
  static async getAccessCodes(tenantId: string, guildId: string) {
    return await prisma.verification_access_codes.findMany({
      where: { tenantId, guildId }
    });
  }

  /**
   * Access Codes: Adds a new valid code
   */
  static async addAccessCode(tenantId: string, guildId: string, code: string) {
    return await prisma.verification_access_codes.create({
      data: { tenantId, guildId, code }
    });
  }

  /**
   * Access Codes: Deletes a specific code
   */
  static async deleteAccessCode(tenantId: string, guildId: string, code: string) {
    return await prisma.verification_access_codes.deleteMany({
      where: { tenantId, guildId, code }
    });
  }
}
