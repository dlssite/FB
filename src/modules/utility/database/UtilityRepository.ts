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

  /**
   * Creates a new bot DM broadcast
   */
  static async createBotDMBroadcast(data: {
    tenantId: string;
    guildId: string;
    broadcasterId: string;
    targetType: 'all' | 'role' | 'specific_users';
    roleIds?: string[];
    userIds?: string[];
    messageText?: string;
    mediaUrls?: string[];
    totalRecipients: number;
  }) {
    return await (prisma as any).bot_dm_broadcasts.create({
      data: {
        tenantId: data.tenantId,
        guildId: data.guildId,
        broadcasterId: data.broadcasterId,
        targetType: data.targetType,
        roleIds: data.roleIds || [],
        userIds: data.userIds || [],
        messageText: data.messageText,
        mediaUrls: data.mediaUrls || [],
        totalRecipients: data.totalRecipients,
        status: 'pending'
      }
    });
  }

  /**
   * Updates bot DM broadcast status and counts
   */
  static async updateBotDMBroadcast(broadcastId: number, data: {
    status?: 'pending' | 'in_progress' | 'completed';
    successCount?: number;
    failureCount?: number;
    completedAt?: Date;
  }) {
    return await (prisma as any).bot_dm_broadcasts.update({
      where: { id: broadcastId },
      data
    });
  }

  /**
   * Gets bot DM broadcast by ID
   */
  static async getBotDMBroadcast(broadcastId: number) {
    return await (prisma as any).bot_dm_broadcasts.findUnique({
      where: { id: broadcastId }
    });
  }

  /**
   * Gets all bot DM broadcasts for a guild
   */
  static async getBotDMBroadcastsForGuild(tenantId: string, guildId: string, limit = 10) {
    return await (prisma as any).bot_dm_broadcasts.findMany({
      where: { tenantId, guildId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
