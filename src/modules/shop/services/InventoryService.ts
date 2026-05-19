import { ShopRepository } from '../database/ShopRepository';
import { shopRegistry } from '../catalog/engine/Registry';
import { prisma } from '../../../database/client';

export interface HydratedItem {
  instanceId: string;
  itemId: string;
  name: string;
  description: string | null;
  category: string;
  rarity: string;
  condition: number;
  metadata: Record<string, any>; // The merged stats
  acquiredAt: Date;
}

export class InventoryService {
  /**
   * Fetches a user's inventory and "hydrates" it from the Code Registry.
   */
  static async getHydratedCategoryItems(tenantId: string, guildId: string, userId: string, categoryIdentifier?: string): Promise<HydratedItem[]> {
    await shopRegistry.loadCatalog();

    let identifiers: string[] | undefined;
    if (categoryIdentifier) {
      identifiers = shopRegistry.getItemsByCategory(categoryIdentifier).map(i => i.id);
    }

    const instances = await prisma.shop_inventory.findMany({
      where: { 
        tenantId, 
        guildId, 
        userId, 
        ...(identifiers ? { itemIdentifier: { in: identifiers } } : {})
      },
      orderBy: { acquiredAt: 'desc' }
    });
    
    return instances.map(inst => this.hydrateItem(inst));
  }

  /**
   * Fetches a specific instance and hydrates it.
   */
  static async getHydratedInstance(instanceId: string): Promise<HydratedItem | null> {
    const instance = await ShopRepository.getInventoryInstance(instanceId);
    if (!instance) return null;
    
    await shopRegistry.loadCatalog();
    return this.hydrateItem(instance);
  }

  /**
   * Reduces the condition of an item instance.
   */
  static async degradeItemCondition(instanceId: string, amount: number) {
    const instance = await ShopRepository.getInventoryInstance(instanceId);
    if (!instance) return;

    const newCondition = Math.max(0, instance.condition - amount);
    await prisma.shop_inventory.update({
      where: { id: instanceId },
      data: { condition: newCondition }
    });
  }

  /**
   * Restores an item instance to full condition.
   */
  static async repairItem(instanceId: string) {
    await prisma.shop_inventory.update({
      where: { id: instanceId },
      data: { condition: 100 }
    });
  }

  /**
   * Merges code-defined base stats with database-persistent modifiers.
   */
  private static hydrateItem(instance: any): HydratedItem {
    const itemDefinition = shopRegistry.getItem(instance.itemIdentifier);
    
    // Fallback if item was removed from code but exists in DB
    const baseMeta = (itemDefinition?.metadata as Record<string, any>) || {};
    const modMeta = (instance.metadata_modifiers as Record<string, any>) || {};
    
    // Merge logic
    const mergedMeta: Record<string, any> = { ...baseMeta };
    for (const [key, value] of Object.entries(modMeta)) {
      if (typeof value === 'number' && typeof baseMeta[key] === 'number') {
        mergedMeta[key] = baseMeta[key] + value;
      } else {
        mergedMeta[key] = value;
      }
    }

    return {
      instanceId: instance.id,
      itemId: instance.itemIdentifier,
      name: itemDefinition?.name || `Unknown Asset (${instance.itemIdentifier})`,
      description: itemDefinition?.description || 'Data missing.',
      category: itemDefinition?.category || 'unknown',
      rarity: instance.rarity,
      condition: instance.condition,
      metadata: mergedMeta,
      acquiredAt: instance.acquiredAt
    };
  }
}
