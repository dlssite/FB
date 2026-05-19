import { prisma } from '../../../database/client';

export class WelcomeRepository {
  /**
   * Fetches the welcome settings for a guild.
   */
  static async getSettings(tenantId: string, guildId: string) {
    return await prisma.welcome_settings.findUnique({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
    });
  }

  /**
   * Updates or creates welcome settings.
   */
  static async upsertSettings(tenantId: string, guildId: string, data: any) {
    const now = new Date();
    return await prisma.welcome_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: {
        ...data,
        updatedAt: now,
      },
      create: {
        guildId,
        tenantId,
        ...data,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}
