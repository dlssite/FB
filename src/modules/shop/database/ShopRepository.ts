import { prisma } from '../../../database/client';

export class ShopRepository {
  /**
   * INVENTORY MANAGEMENT (V3 Code-Driven)
   */
  static async getUserInventory(tenantId: string, guildId: string, userId: string, categoryIdentifier?: string) {
    // Note: Category filtering now needs to be handled via hydration from the Registry
    // for now we fetch all and let the Service filter, or filter by itemIdentifier prefix
    const results = await prisma.shop_inventory.findMany({
      where: { tenantId, guildId, userId },
      orderBy: { acquiredAt: 'desc' }
    });

    if (results.length === 0) {
      return await prisma.shop_inventory.findMany({
        where: { guildId, userId },
        orderBy: { acquiredAt: 'desc' }
      });
    }
    return results;
  }

  static async getInventoryInstance(instanceId: string) {
    return await prisma.shop_inventory.findUnique({
      where: { id: instanceId }
    });
  }

  static async addToInventory(data: {
    tenantId: string;
    guildId: string;
    userId: string;
    itemIdentifier: string;
    rarity: string;
    condition?: number;
    metadata_modifiers?: any;
  }) {
    return await prisma.shop_inventory.create({
      data: {
        tenantId: data.tenantId,
        guildId: data.guildId,
        userId: data.userId,
        itemIdentifier: data.itemIdentifier,
        rarity: data.rarity,
        condition: data.condition ?? 100,
        metadata_modifiers: data.metadata_modifiers || {}
      }
    });
  }

  static async removeFromInventory(instanceId: string) {
    return await prisma.shop_inventory.delete({
      where: { id: instanceId }
    });
  }
}
