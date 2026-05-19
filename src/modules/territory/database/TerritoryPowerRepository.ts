import { prisma } from '../../../database/client';

export interface TerritoryActionLog {
  nationId: number;
  nationName: string;
  patronId: string;
  patronTag: string;
  targetId: string;
  targetTag: string;
  action: string;
  reason?: string;
}

export class TerritoryPowerRepository {
  /**
   * Records a governance action in the audit trail.
   */
  static async logAction(tenantId: string, guildId: string, data: TerritoryActionLog) {
    return await prisma.territory_actions.create({
      data: {
        guildId,
        tenantId,
        nationId: data.nationId,
        nationName: data.nationName,
        patronId: data.patronId,
        patronTag: data.patronTag,
        targetId: data.targetId,
        targetTag: data.targetTag,
        action: data.action,
        reason: data.reason || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Fetches the history of actions for a specific nation.
   */
  static async getHistoryByNation(tenantId: string, guildId: string, nationId: number, limit: number = 10) {
    return await prisma.territory_actions.findMany({
      where: {
        guildId,
        tenantId,
        nationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Fetches the history of actions for a specific target user in a nation.
   */
  static async getHistoryByTarget(tenantId: string, guildId: string, nationId: number, targetId: string) {
    return await prisma.territory_actions.findMany({
      where: {
        guildId,
        tenantId,
        nationId,
        targetId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
