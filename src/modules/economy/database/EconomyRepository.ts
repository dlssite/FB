import { prisma } from '../../../database/client';

export class EconomyRepository {
  /**
   * Fetches the economy profile for a user.
   */
  static async getUser(tenantId: string, userId: string) {
    return await prisma.flameborn_users.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });
  }

  /**
   * Atomic balance update using Prisma increments.
   */
  static async updateBalance(
    tenantId: string, 
    userId: string, 
    data: { embers?: number; ruby?: number; vault?: number }
  ) {
    return await prisma.flameborn_users.upsert({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      update: {
        embers: data.embers ? { increment: data.embers } : undefined,
        flamebornRuby: data.ruby ? { increment: data.ruby } : undefined,
        emberVault: data.vault ? { increment: data.vault } : undefined,
      },
      create: {
        userId,
        tenantId,
        embers: BigInt(data.embers || 0),
        flamebornRuby: BigInt(data.ruby || 0),
        emberVault: BigInt(data.vault || 0),
      },
    });
  }

  /**
   * Updates timestamps for daily, work, etc.
   */
  static async updateCooldown(tenantId: string, userId: string, field: 'lastDaily' | 'lastWork' | 'lastMine' | 'lastBeg' | 'lastRob' | 'lastHack') {
    const updateData: any = { [field]: new Date() };
    
    // Reset mine charges if it's a mining cooldown update
    if (field === 'lastMine') {
      updateData.mineCharges = { decrement: 1 };
    }

    return await prisma.flameborn_users.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: updateData,
    });
  }

  /**
   * Resets daily mining charges.
   */
  static async resetMineCharges(tenantId: string, userId: string, amount: number = 2) {
    return await prisma.flameborn_users.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: {
        mineCharges: amount,
      },
    });
  }

  /**
   * Inventory Management (Stacked Items)
   */
  static async getInventory(tenantId: string, userId: string) {
    return await prisma.inventory_adventures.findMany({
      where: { userId, tenantId },
    });
  }

  static async updateItemQuantity(tenantId: string, userId: string, itemName: string, amount: number) {
    return await prisma.inventory_adventures.upsert({
      where: {
        userId_itemName_tenantId: {
          userId,
          itemName,
          tenantId,
        },
      },
      update: {
        quantity: { increment: amount },
      },
      create: {
        userId,
        itemName,
        tenantId,
        quantity: amount,
      },
    });
  }

  static async updateCareer(tenantId: string, userId: string, careerId: number) {
    return await prisma.flameborn_users.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: {
        careerMastered: careerId,
      },
    });
  }

  static async updateVaultType(tenantId: string, userId: string, vaultType: string) {
    return await prisma.flameborn_users.update({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      data: {
        bankType: vaultType,
      },
    });
  }

  /**
   * Mining Sessions (Persistent across restarts)
   */
  static async startMiningSession(data: { userId: string; guildId: string; channelId: string; resourceName: string; yield: number; startTime: Date; endTime: Date }) {
    return await prisma.economy_mining_sessions.create({
      data: {
        userId: data.userId,
        guildId: data.guildId,
        channelId: data.channelId,
        resourceName: data.resourceName,
        yield: data.yield,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  static async getActiveMiningSession(userId: string, guildId: string) {
    return await prisma.economy_mining_sessions.findFirst({
      where: {
        userId,
        guildId,
        status: 'active',
      },
    });
  }

  static async getExpiredMiningSessions() {
    return await prisma.economy_mining_sessions.findMany({
      where: {
        status: 'active',
        endTime: { lte: new Date() },
      },
    });
  }

  static async completeMiningSession(id: number) {
    return await prisma.economy_mining_sessions.update({
      where: { id },
      data: { status: 'completed', updatedAt: new Date() },
    });
  }

  /**
   * Transaction Ledger
   */
  static async addTransaction(data: {
    tenantId: string;
    userId: string;
    type: 'INCOME' | 'LOSS' | 'TRANSFER' | 'ADMIN';
    category: string;
    amount: number | bigint;
    balance: number | bigint;
    reason?: string;
    metadata?: any;
  }) {
    return await prisma.economy_transactions.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        category: data.category,
        amount: BigInt(data.amount),
        balance: BigInt(data.balance),
        reason: data.reason,
        metadata: data.metadata || {},
      },
    });
  }

  static async getTransactions(tenantId: string, userId: string, limit: number = 10) {
    return await prisma.economy_transactions.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Leaderboard: Fetches top users by net worth.
   */
  static async getTopUsers(tenantId: string, limit: number = 10) {
    // We use a raw query or fetch and sort. For 10, fetch and sort is safe.
    const users = await prisma.flameborn_users.findMany({
      where: { tenantId },
      orderBy: [
        { embers: 'desc' }
      ],
      take: limit * 5, // Fetch more to account for vault variations
    });

    return users
      .map(u => ({
        ...u,
        netWorth: Number(u.embers || 0) + Number(u.emberVault || 0)
      }))
      .sort((a, b) => b.netWorth - a.netWorth)
      .slice(0, limit);
  }

  /**
   * Fetches the net worth rank for a user.
   */
  static async getUserRank(tenantId: string, userId: string) {
    const users = await prisma.flameborn_users.findMany({
      where: { tenantId },
    });
    const sorted = users
      .map(u => ({ userId: u.userId, netWorth: Number(u.embers || 0) + Number(u.emberVault || 0) }))
      .sort((a, b) => b.netWorth - a.netWorth);
    const index = sorted.findIndex(u => u.userId === userId);
    return index >= 0 ? index + 1 : 0;
  }
}
