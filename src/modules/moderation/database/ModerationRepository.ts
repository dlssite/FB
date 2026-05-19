import { prisma } from '../../../database/client';

export class ModerationRepository {
  /**
   * Logs a moderation action to the database.
   */
  static async logAction(data: {
    guildId: string;
    tenantId: string;
    moderatorId: string;
    moderatorTag: string;
    targetId: string;
    targetTag: string;
    action: string;
    reason?: string;
  }) {
    const now = new Date();
    return await prisma.mod_logs.create({
      data: {
        ...data,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  /**
   * Fetches only warnings for a specific user (non-deleted).
   */
  static async getUserWarnings(tenantId: string, guildId: string, userId: string) {
    return await prisma.mod_logs.findMany({
      where: {
        tenantId,
        guildId,
        targetId: userId,
        action: 'WARN',
        deleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deletes (soft-deletes) a specific warning by ID.
   */
  static async deleteWarning(id: number, tenantId: string, guildId: string) {
    return await prisma.mod_logs.updateMany({
      where: {
        id,
        tenantId,
        guildId,
        action: 'WARN',
      },
      data: {
        deleted: true,
      },
    });
  }

  /**
   * Clears (soft-deletes) all warnings for a specific user.
   */
  static async clearAllWarnings(tenantId: string, guildId: string, userId: string) {
    return await prisma.mod_logs.updateMany({
      where: {
        tenantId,
        guildId,
        targetId: userId,
        action: 'WARN',
      },
      data: {
        deleted: true,
      },
    });
  }

  /**
   * Fetches all mod logs for a specific user.
   */
  static async getUserLogs(tenantId: string, guildId: string, userId: string) {
    console.log(`[ModLog:DB_READ] Fetching logs for ${userId} | Tenant: ${tenantId} | Guild: ${guildId}`);
    return await prisma.mod_logs.findMany({
      where: {
        tenantId,
        guildId,
        targetId: userId,
        deleted: false
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetches mod logs for a specific guild/tenant.
   */
  static async getLogs(tenantId: string, guildId: string, limit = 50) {
    return await prisma.mod_logs.findMany({
      where: { tenantId, guildId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Fetches actions performed BY a specific moderator.
   */
  static async getModeratorLogs(tenantId: string, guildId: string, moderatorId: string) {
    return await prisma.mod_logs.findMany({
      where: {
        tenantId,
        guildId,
        moderatorId,
        deleted: false
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 for performance
    });
  }
}
