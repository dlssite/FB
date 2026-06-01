import { prisma } from '../../../database/client';

export class BoosterRepository {
  /**
   * Fetches the custom booster role associated with an owner.
   */
  static async getRole(tenantId: string, guildId: string, ownerId: string) {
    return await prisma.booster_roles.findUnique({
      where: {
        guildId_ownerId_tenantId: { guildId, ownerId, tenantId }
      }
    });
  }

  /**
   * Fetches the custom booster role associated with a shared buddy.
   */
  static async getRoleByBuddy(tenantId: string, guildId: string, buddyId: string) {
    return await prisma.booster_roles.findFirst({
      where: { tenantId, guildId, buddyId }
    });
  }

  /**
   * Registers a newly created custom role in the database.
   */
  static async registerRole(tenantId: string, guildId: string, ownerId: string, roleId: string) {
    return await prisma.booster_roles.upsert({
      where: { guildId_ownerId_tenantId: { guildId, ownerId, tenantId } },
      update: { roleId, isGrace: false, graceUntil: null },
      create: { tenantId, guildId, ownerId, roleId }
    });
  }

  /**
   * Links a buddy to a booster's custom role.
   */
  static async linkBuddy(tenantId: string, guildId: string, ownerId: string, buddyId: string | null) {
    return await prisma.booster_roles.update({
      where: { guildId_ownerId_tenantId: { guildId, ownerId, tenantId } },
      data: { buddyId }
    });
  }

  /**
   * Starts or stops the grace period for a booster role.
   */
  static async setGracePeriod(tenantId: string, guildId: string, ownerId: string, isGrace: boolean, graceUntil: Date | null) {
    return await prisma.booster_roles.update({
      where: { guildId_ownerId_tenantId: { guildId, ownerId, tenantId } },
      data: { isGrace, graceUntil }
    });
  }

  /**
   * Deletes a registered role from the database.
   */
  static async deleteRole(tenantId: string, guildId: string, ownerId: string) {
    return await prisma.booster_roles.delete({
      where: { guildId_ownerId_tenantId: { guildId, ownerId, tenantId } }
    });
  }

  /**
   * Fetches all booster roles for a guild.
   */
  static async getGuildRoles(tenantId: string, guildId: string) {
    return await prisma.booster_roles.findMany({
      where: { tenantId, guildId }
    });
  }

  /**
   * Fetches the booster settings for a guild.
   */
  static async getSettings(tenantId: string, guildId: string) {
    return await prisma.booster_settings.findUnique({
      where: { guildId_tenantId: { guildId, tenantId } }
    });
  }

  /**
   * Upserts the booster settings for a guild.
   */
   static async updateSettings(tenantId: string, guildId: string, data: { boosterChannelId?: string, roleAnchorId?: string }) {
     const now = new Date();
     return await prisma.booster_settings.upsert({
       where: { guildId_tenantId: { guildId, tenantId } },
       update: { ...data, updatedAt: now },
       create: { tenantId, guildId, ...data, createdAt: now, updatedAt: now }
     });
   }
}
