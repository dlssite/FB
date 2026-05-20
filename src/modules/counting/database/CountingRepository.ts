import { prisma } from '../../../database/client';

export class CountingRepository {
  /**
   * Fetches or creates counting settings for a guild.
   */
  static async getSettings(tenantId: string, guildId: string) {
    let settings = await prisma.counting_settings.findUnique({
      where: { guildId_tenantId: { guildId, tenantId } }
    });

    if (!settings) {
      const now = new Date();
      settings = await prisma.counting_settings.create({
        data: { guildId, tenantId, createdAt: now, updatedAt: now }
      });
    }
    return settings;
  }

  /**
   * Updates the counting settings (e.g. current count, last user).
   */
  static async updateSettings(tenantId: string, guildId: string, data: any) {
    const now = new Date();
    return await prisma.counting_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: { ...data, updatedAt: now },
      create: { guildId, tenantId, ...data, createdAt: now, updatedAt: now }
    });
  }

  /**
   * Fetches a user's counting statistics.
   */
  static async getUser(tenantId: string, guildId: string, userId: string) {
    const now = new Date();
    return await prisma.counting_users.upsert({
      where: {
        userId_guildId_tenantId: { userId, guildId, tenantId }
      },
      update: {},
      create: { userId, guildId, tenantId, createdAt: now, updatedAt: now }
    });
  }

  /**
   * Increments total counts or ruined counts for a user.
   */
  static async updateUserStats(
    tenantId: string, 
    guildId: string, 
    userId: string, 
    type: 'success' | 'ruin' | 'save'
  ) {
    const updateData: any = {};
    if (type === 'success') updateData.totalCounts = { increment: 1 };
    if (type === 'ruin') updateData.ruinedCounts = { increment: 1 };
    if (type === 'save') updateData.savesUsed = { increment: 1 };

    const now = new Date();
    return await prisma.counting_users.upsert({
      where: {
        userId_guildId_tenantId: { userId, guildId, tenantId }
      },
      update: { ...updateData, updatedAt: now },
      create: { 
        userId, 
        guildId, 
        tenantId, 
        totalCounts: type === 'success' ? 1 : 0,
        ruinedCounts: type === 'ruin' ? 1 : 0,
        savesUsed: type === 'save' ? 1 : 0,
        createdAt: now,
        updatedAt: now
      }
    });
  }

  /**
   * Retrieves the top 10 most reliable counters in the guild.
   */
  static async getLeaderboard(tenantId: string, guildId: string, limit: number = 10) {
    return await prisma.counting_users.findMany({
      where: { guildId, tenantId, totalCounts: { gt: 0 } },
      orderBy: { totalCounts: 'desc' },
      take: limit
    });
  }

  /**
   * Retrieves the top 10 users who ruined the count most often.
   */
  static async getShameboard(tenantId: string, guildId: string, limit: number = 10) {
    return await prisma.counting_users.findMany({
      where: { guildId, tenantId, ruinedCounts: { gt: 0 } },
      orderBy: { ruinedCounts: 'desc' },
      take: limit
    });
  }
}
