import { prisma } from '../../../database/client';

export class UtilityRepository {
  /**
   * Sets a user as AFK
   */
  static async setAFK(tenantId: string, guildId: string, userId: string, reason: string) {
    return await prisma.afk_status.upsert({
      where: {
        guildId_userId_tenantId: { guildId, userId, tenantId }
      },
      update: { reason, createdAt: new Date() },
      create: { 
        tenantId, 
        guildId, 
        userId, 
        reason,
        createdAt: new Date()
      }
    });
  }

  /**
   * Removes a user's AFK status
   */
  static async clearAFK(tenantId: string, guildId: string, userId: string) {
    return await prisma.afk_status.deleteMany({
      where: { tenantId, guildId, userId }
    });
  }

  /**
   * Fetches a user's AFK status
   */
  static async getAFK(tenantId: string, guildId: string, userId: string) {
    return await prisma.afk_status.findUnique({
      where: {
        guildId_userId_tenantId: { guildId, userId, tenantId }
      }
    });
  }

  /**
   * Creates a new user report
   */
  static async createReport(data: {
    tenantId: string;
    guildId: string;
    reporterId: string;
    targetId: string;
    reason: string;
  }) {
    return await prisma.reports.create({
      data: {
        ...data,
        status: 'pending'
      }
    });
  }
}
