import { prisma } from '../../../database/client';
import { ShopRepository } from '../database/ShopRepository';
import { shopRegistry } from '../catalog/engine/Registry';
import { Logger } from '../../../utils/logger';

export class ShopService {
  /**
   * Purchases an item from the Code Registry.
   */
  static async purchaseItem(tenantId: string, guildId: string, userId: string, itemId: string) {
    try {
      // 1. Ensure Registry is loaded (Boot-strapping if necessary)
      await shopRegistry.loadCatalog();

      // 2. Lookup item in Registry - try by ID first, then by name
      let item = shopRegistry.getItem(itemId);
      
      // If not found by ID, try finding by name (case-insensitive)
      if (!item) {
        const allItems = shopRegistry.getItems();
        const nameLower = itemId.toLowerCase();
        item = allItems.find((i: any) => i.name?.toLowerCase() === nameLower);
        
        if (!item) {
          Logger.warn(`[Shop] Item lookup failed: "${itemId}" not found by ID or name`);
          return { success: false, error: 'Item no longer exists in the catalog.' };
        }
        Logger.info(`[Shop] Found item by name match: "${itemId}" -> "${item.id}"`);
      }

      // 3. Check requirements hook
      if (item.requirements) {
        const req = await item.requirements(userId, guildId);
        if (!req.success) return { success: false, error: req.reason || 'Requirement not met.' };
      }

      // --- VEHICLE CAPACITY CHECK ---
      if (item.metadata?.isVehicle === true) {
        const { TerritoryBuildingService } = await import('../../territory/services/TerritoryBuildingService');
        const { InventoryService } = await import('./InventoryService');

        const capacity = await TerritoryBuildingService.getUserVehicleCapacity(tenantId, guildId, userId);
        const currentVehicles = await InventoryService.getHydratedCategoryItems(tenantId, guildId, userId);
        const vehicleCount = currentVehicles.filter(v => v.metadata?.isVehicle === true).length;

        if (vehicleCount >= capacity) {
          return { 
            success: false, 
            error: `🚗 Hangar Limit Reached! You can only own **${capacity}** vehicle(s) with your current infrastructure. Deploy more Outposts to expand your garage.` 
          };
        }
      }

      // 4. Check & Deduct Embers
      const user = await prisma.flameborn_users.findUnique({
        where: { userId_tenantId: { userId, tenantId } }
      });

      Logger.info(`[SHOP_DEBUG] User: ${userId} | Tenant: ${tenantId} | Price: ${item.basePrice} | Balance: ${user?.embers || 0n}`);

      if (!user || (user.embers || 0n) < BigInt(item.basePrice)) {
        const currentBal = user ? Number(user.embers || 0n).toLocaleString() : '0';
        return { success: false, error: `Insufficient Embers. This item costs ${item.basePrice.toLocaleString()} Embers (Your Balance: ${currentBal}).` };
      }

      // Deduct
      await prisma.flameborn_users.update({
        where: { userId_tenantId: { userId, tenantId } },
        data: { embers: { decrement: BigInt(item.basePrice) } }
      });

      // Log transaction
      const newBalance = (user.embers || 0n) - BigInt(item.basePrice);
      await prisma.economy_transactions.create({
        data: {
          tenantId,
          userId,
          type: 'LOSS',
          category: 'SHOP_PURCHASE',
          amount: BigInt(item.basePrice),
          balance: newBalance,
          reason: `Purchased ${item.name}`,
          metadata: { itemId, category: item.category }
        }
      });

      // 5. Generate Procedural Stats & Add to Inventory
      const { rarity, modifiers } = this.generateProceduralStats(item);

      const instance = await ShopRepository.addToInventory({
        tenantId,
        guildId,
        userId,
        itemIdentifier: item.id,
        rarity: rarity,
        metadata_modifiers: { ...item.metadata, ...modifiers }
      });

      // 6. Execute Post-Purchase Hooks
      if (item.onPurchase) {
        await item.onPurchase(userId, guildId, instance).catch(err => {
          Logger.error(`[SHOP_SERVICE] Hook Error (onPurchase): ${err.message}`, err);
        });
      }

      Logger.info(`[PURCHASE] ${userId} bought ${item.name} (${rarity})`);

      return { 
        success: true, 
        itemName: item.name, 
        rarity, 
        remainingBalance: Number(newBalance).toLocaleString() 
      };
    } catch (err: any) {
      Logger.error(`[SHOP_SERVICE] Purchase crash: ${err.message}`, err);
      return { success: false, error: 'A systemic error occurred during the transaction.' };
    }
  }

  /**
   * Procedural Rarity Engine
   */
  private static generateProceduralStats(item: any) {
    const roll = Math.random() * 100;
    let rarity = item.rarity || 'common';
    let buffMultiplier = 0;

    // We allow items to have their own procedural weights if we want later
    if (roll > 99) {
      rarity = 'legendary';
      buffMultiplier = 0.25;
    } else if (roll > 90) {
      rarity = 'epic';
      buffMultiplier = 0.15;
    } else if (roll > 70) {
      rarity = 'rare';
      buffMultiplier = 0.05;
    }

    const modifiers: Record<string, any> = {};
    if (buffMultiplier > 0 && item.metadata) {
      for (const [key, value] of Object.entries(item.metadata)) {
        if (typeof value === 'number') {
          modifiers[key] = Math.ceil(value * buffMultiplier);
        }
      }
    }

    return { rarity, modifiers };
  }
}
