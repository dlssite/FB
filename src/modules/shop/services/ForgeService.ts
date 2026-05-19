import { prisma } from '../../../database/client';
import { ShopRepository } from '../database/ShopRepository';
import { shopRegistry } from '../catalog/engine/Registry';

export class ForgeService {
  /**
   * Crafts a new item by consuming multiple material items from the user's inventory.
   */
  static async craftItem(tenantId: string, guildId: string, userId: string, targetItemId: string, componentInstanceIds: string[]) {
    await shopRegistry.loadCatalog();

    // 1. Validate the target blueprint exists in Registry
    const targetItem = shopRegistry.getItem(targetItemId);
    if (!targetItem) throw new Error('Target blueprint not found in the catalog.');

    // 2. Validate components exist and belong to user
    const components = [];
    for (const id of componentInstanceIds) {
      const instance = await ShopRepository.getInventoryInstance(id);
      if (!instance || instance.userId !== userId) throw new Error(`Material ${id} is invalid or not owned by you.`);
      components.push(instance);
    }

    // 3. ATOMIC CRAFTING
    return await prisma.$transaction(async (tx) => {
      // Consume materials
      await tx.shop_inventory.deleteMany({
        where: { id: { in: componentInstanceIds } }
      });

      // Procedural Generation (Crafting has higher rarity floors)
      const roll = Math.random() * 100;
      let rarity = 'common';
      if (roll > 90) rarity = 'legendary';
      else if (roll > 70) rarity = 'epic';
      else if (roll > 40) rarity = 'rare';

      // Create the new item instance
      return await tx.shop_inventory.create({
        data: {
          tenantId,
          guildId,
          userId,
          itemIdentifier: targetItemId,
          rarity,
          condition: 100,
          metadata_modifiers: targetItem.metadata || {}
        }
      });
    });
  }
}
