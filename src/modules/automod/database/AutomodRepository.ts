import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';

export class AutomodRepository {
  /**
   * Fetches automod settings for a guild with Redis caching.
   */
  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:automod:${tenantId}:${guildId}`;
    const cached = await RedisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const settings = await prisma.automod_settings.findUnique({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
    });

    if (settings) {
      await RedisService.set(cacheKey, JSON.stringify(settings), 300);
    }

    return settings;
  }

  /**
   * Updates or creates automod settings.
   */
  static async upsertSettings(tenantId: string, guildId: string, data: any) {
    const now = new Date();
    const result = await prisma.automod_settings.upsert({
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

    await this.invalidateCache(tenantId, guildId);
    return result;
  }

  /**
   * Updates automod settings (simpler than upsert).
   */
  static async updateSettings(tenantId: string, guildId: string, data: any) {
    const now = new Date();
    const result = await prisma.automod_settings.update({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      data: {
        ...data,
        updatedAt: now,
      },
    });

    await this.invalidateCache(tenantId, guildId);
    return result;
  }

  /**
   * Invalidates automod settings cache.
   */
  static async invalidateCache(tenantId: string, guildId: string) {
    await RedisService.del(`settings:automod:${tenantId}:${guildId}`);
  }

  /**
   * Check if a specific exemption exists
   */
  static async isExempt(guildId: string, tenantId: string, type: string, targetId: string): Promise<boolean> {
    const cacheKey = `exempt:${tenantId}:${guildId}:${type}:${targetId}`;
    const cached = await RedisService.get(cacheKey);
    if (cached) return cached === 'true';

    const exemption = await (prisma as any).automod_exemptions.findUnique({
      where: {
        guildId_tenantId_exemptionType_targetId: {
          guildId,
          tenantId,
          exemptionType: type,
          targetId,
        },
      },
    });

    const exists = !!exemption;
    await RedisService.set(cacheKey, exists ? 'true' : 'false', 600);
    return exists;
  }

  /**
   * Add exemption
   */
  static async addExemption(
    guildId: string,
    tenantId: string,
    type: string,
    targetId: string,
    reason?: string
  ) {
    const now = new Date();
    const result = await (prisma as any).automod_exemptions.upsert({
      where: {
        guildId_tenantId_exemptionType_targetId: {
          guildId,
          tenantId,
          exemptionType: type,
          targetId,
        },
      },
      update: { reason, updatedAt: now },
      create: {
        guildId,
        tenantId,
        exemptionType: type,
        targetId,
        reason,
        createdAt: now,
        updatedAt: now,
      },
    });

    await RedisService.del(`exempt:${tenantId}:${guildId}:${type}:${targetId}`);
    return result;
  }

  /**
   * Remove exemption
   */
  static async removeExemption(guildId: string, tenantId: string, type: string, targetId: string) {
    await (prisma as any).automod_exemptions.delete({
      where: {
        guildId_tenantId_exemptionType_targetId: {
          guildId,
          tenantId,
          exemptionType: type,
          targetId,
        },
      },
    }).catch(() => {});

    await RedisService.del(`exempt:${tenantId}:${guildId}:${type}:${targetId}`);
  }

  /**
   * List exemptions
   */
  static async listExemptions(guildId: string, tenantId: string, type?: string) {
    const where: any = { guildId, tenantId };
    if (type) where.exemptionType = type;

    const exemptions = await (prisma as any).automod_exemptions.findMany({ where });
    return exemptions.map((e: any) => ({
      type: e.exemptionType,
      targetId: e.targetId,
      reason: e.reason,
    }));
  }

  /**
   * Clear exemptions by type
   */
  static async clearExemptions(guildId: string, tenantId: string, type?: string): Promise<number> {
    const where: any = { guildId, tenantId };
    if (type) where.exemptionType = type;

    const result = await (prisma as any).automod_exemptions.deleteMany({ where });
    return result.count;
  }

  /**
   * Log a violation
   */
  static async logViolation(
    guildId: string,
    tenantId: string,
    userId: string,
    violationType: string,
    matchedPattern?: string,
    actionTaken: string = 'deleted'
  ) {
    return await (prisma as any).automod_violations.create({
      data: {
        guildId,
        tenantId,
        userId,
        violationType,
        matchedPattern,
        actionTaken,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Get recent violations for a user
   */
  static async getUserViolations(guildId: string, tenantId: string, userId: string, limit: number = 10) {
    return await (prisma as any).automod_violations.findMany({
      where: { guildId, tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Track a violation and get current count
   */
  static async trackViolation(
    guildId: string,
    tenantId: string,
    userId: string,
    violationType: string,
    windowMs: number = 86400000 // 24 hours default
  ): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const counter = await (prisma as any).automod_violation_counters.upsert({
      where: {
        guildId_tenantId_userId_violationType: {
          guildId,
          tenantId,
          userId,
          violationType,
        },
      },
      update: {
        count: { increment: 1 },
        lastViolationAt: now,
      },
      create: {
        guildId,
        tenantId,
        userId,
        violationType,
        count: 1,
        lastViolationAt: now,
        windowStartAt: windowStart,
      },
    });

    // If window expired, reset
    if (counter.windowStartAt.getTime() < windowStart.getTime()) {
      return await (prisma as any).automod_violation_counters.update({
        where: {
          guildId_tenantId_userId_violationType: {
            guildId,
            tenantId,
            userId,
            violationType,
          },
        },
        data: {
          count: 1,
          lastViolationAt: now,
          windowStartAt: now,
        },
      }).then((c: any) => c.count);
    }

    return counter.count;
  }

  /**
   * Get violation count for a user/type
   */
  static async getViolationCount(
    guildId: string,
    tenantId: string,
    userId: string,
    violationType: string
  ): Promise<number> {
    const counter = await (prisma as any).automod_violation_counters.findUnique({
      where: {
        guildId_tenantId_userId_violationType: {
          guildId,
          tenantId,
          userId,
          violationType,
        },
      },
    });

    return counter?.count || 0;
  }

  /**
   * Reset violation counter for a user
   */
  static async resetViolationCounter(
    guildId: string,
    tenantId: string,
    userId: string,
    violationType?: string
  ) {
    if (violationType) {
      await (prisma as any).automod_violation_counters.delete({
        where: {
          guildId_tenantId_userId_violationType: {
            guildId,
            tenantId,
            userId,
            violationType,
          },
        },
      }).catch(() => {});
    } else {
      await (prisma as any).automod_violation_counters.deleteMany({
        where: { guildId, tenantId, userId },
      });
    }
  }
}
