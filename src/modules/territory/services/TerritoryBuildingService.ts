import { prisma } from '../../../database/client';

export class TerritoryBuildingService {
  /**
   * Deploys a new building to a nation.
   */
  static async deployBuilding(tenantId: string, guildId: string, nationId: number, ownerId: string, buildingId: string, metadata: any = {}) {
    return await prisma.territory_buildings.create({
      data: {
        tenantId,
        guildId,
        nationId,
        ownerId,
        buildingId,
        metadata
      }
    });
  }

  /**
   * Gets all deployed buildings in a specific nation.
   */
  static async getBuildingsByNation(tenantId: string, guildId: string, nationId: number) {
    return await prisma.territory_buildings.findMany({
      where: { tenantId, guildId, nationId }
    });
  }

  /**
   * Gets all buildings owned by a specific user across all nations.
   */
  static async getBuildingsByUser(tenantId: string, guildId: string, ownerId: string) {
    return await prisma.territory_buildings.findMany({
      where: { tenantId, guildId, ownerId }
    });
  }

  /**
   * Gets a summary of infrastructure in a nation, grouped by buildingId.
   */
  static async getNationInfrastructureSummary(tenantId: string, guildId: string, nationId: number) {
    const buildings = await this.getBuildingsByNation(tenantId, guildId, nationId);
    
    const summary: Record<string, number> = {};
    for (const b of buildings) {
      if (!summary[b.buildingId]) summary[b.buildingId] = 0;
      summary[b.buildingId]++;
    }
    
    return summary;
  }

  /**
   * Gets the top colonist leaders for a specific nation based on infrastructure count.
   */
  static async getProminentColonists(tenantId: string, guildId: string, nationId: number, limit: number = 3) {
    const buildings = await this.getBuildingsByNation(tenantId, guildId, nationId);
    
    const colonistCounts: Record<string, number> = {};
    for (const b of buildings) {
      if (!colonistCounts[b.ownerId]) colonistCounts[b.ownerId] = 0;
      colonistCounts[b.ownerId]++;
    }

    return Object.entries(colonistCounts)
      .sort((a, b) => b[1] - a[1]) // Sort descending by count
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, count }));
  }

  /**
   * Calculates the total vehicle capacity for a user based on their deployed buildings.
   * If no buildings are owned, the default capacity is 1.
   */
  static async getUserVehicleCapacity(tenantId: string, guildId: string, userId: string): Promise<number> {
    const { shopRegistry } = await import('../../shop/catalog/engine/Registry');
    await shopRegistry.loadCatalog();

    const buildings = await this.getBuildingsByUser(tenantId, guildId, userId);
    
    // Default base capacity if no buildings are owned
    if (buildings.length === 0) return 1;

    let totalCapacity = 0;
    for (const b of buildings) {
      const itemDef = shopRegistry.getItem(b.buildingId);
      const capacity = (itemDef?.metadata as any)?.capacity?.vehicles || 0;
      totalCapacity += capacity;
    }

    // Fallback to 1 if the buildings somehow provide 0 capacity
    return Math.max(1, totalCapacity);
  }

  /**
   * Calculates the total friend capacity for a user based on their deployed buildings.
   * Default base capacity is 5.
   */
  static async getUserFriendCapacity(tenantId: string, guildId: string, userId: string): Promise<number> {
    const { shopRegistry } = await import('../../shop/catalog/engine/Registry');
    await shopRegistry.loadCatalog();

    const buildings = await this.getBuildingsByUser(tenantId, guildId, userId);
    
    // Base capacity
    let totalCapacity = 5;

    for (const b of buildings) {
      const itemDef = shopRegistry.getItem(b.buildingId);
      const capacity = (itemDef?.metadata as any)?.capacity?.members || 0;
      totalCapacity += capacity;
    }

    return totalCapacity;
  }
}
