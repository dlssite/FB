import { prisma } from '../../../database/client';
import { ShopRepository } from '../database/ShopRepository';
import { shopRegistry } from '../catalog/engine/Registry';

export class TradeService {
  /**
   * Directly transfers an item from one user to another.
   */
  static async transferItem(instanceId: string, fromUserId: string, toUserId: string) {
    const instance = await ShopRepository.getInventoryInstance(instanceId);
    if (!instance) throw new Error('Item not found.');
    if (instance.userId !== fromUserId) throw new Error('You do not own this item.');
    
    // Check tradability from Registry
    await shopRegistry.loadCatalog();
    const itemDefinition = shopRegistry.getItem(instance.itemIdentifier);
    
    // Default to true if not defined in code (or handle as bound if missing)
    const isTradeable = itemDefinition?.metadata?.isTradeable !== false;
    if (!isTradeable) throw new Error('This item is bound to your account and cannot be traded.');

    return await prisma.shop_inventory.update({
      where: { id: instanceId },
      data: { userId: toUserId }
    });
  }

  /**
   * Safe P2P Trade Escrow Execution
   */
  static async executeTrade(
    tenantId: string,
    guildId: string,
    partyA: { userId: string; offerItems: string[]; offerEmbers: number },
    partyB: { userId: string; offerItems: string[]; offerEmbers: number }
  ) {
    await shopRegistry.loadCatalog();

    return await prisma.$transaction(async (tx) => {
      // 1. Validate Party A
      const userA = await tx.flameborn_users.findUnique({ where: { userId_tenantId: { userId: partyA.userId, tenantId } } });
      if (!userA || (userA.embers || 0n) < BigInt(partyA.offerEmbers)) throw new Error('Party A has insufficient Embers.');
      
      for (const instId of partyA.offerItems) {
        const instance = await tx.shop_inventory.findUnique({ where: { id: instId } });
        const itemDef = shopRegistry.getItem(instance?.itemIdentifier || '');
        if (!instance || instance.userId !== partyA.userId || itemDef?.metadata?.isTradeable === false) {
          throw new Error('Party A offered invalid or untradeable items.');
        }
      }

      // 2. Validate Party B
      const userB = await tx.flameborn_users.findUnique({ where: { userId_tenantId: { userId: partyB.userId, tenantId } } });
      if (!userB || (userB.embers || 0n) < BigInt(partyB.offerEmbers)) throw new Error('Party B has insufficient Embers.');

      for (const instId of partyB.offerItems) {
        const instance = await tx.shop_inventory.findUnique({ where: { id: instId } });
        const itemDef = shopRegistry.getItem(instance?.itemIdentifier || '');
        if (!instance || instance.userId !== partyB.userId || itemDef?.metadata?.isTradeable === false) {
          throw new Error('Party B offered invalid or untradeable items.');
        }
      }

      // 3. Swap Embers
      if (partyA.offerEmbers > 0) {
        await tx.flameborn_users.update({ where: { userId_tenantId: { userId: partyA.userId, tenantId } }, data: { embers: { decrement: BigInt(partyA.offerEmbers) } } });
        await tx.flameborn_users.update({ where: { userId_tenantId: { userId: partyB.userId, tenantId } }, data: { embers: { increment: BigInt(partyA.offerEmbers) } } });
      }

      if (partyB.offerEmbers > 0) {
        await tx.flameborn_users.update({ where: { userId_tenantId: { userId: partyB.userId, tenantId } }, data: { embers: { decrement: BigInt(partyB.offerEmbers) } } });
        await tx.flameborn_users.update({ where: { userId_tenantId: { userId: partyA.userId, tenantId } }, data: { embers: { increment: BigInt(partyB.offerEmbers) } } });
      }

      // 4. Swap Items
      if (partyA.offerItems.length > 0) {
        await tx.shop_inventory.updateMany({ where: { id: { in: partyA.offerItems } }, data: { userId: partyB.userId } });
      }

      if (partyB.offerItems.length > 0) {
        await tx.shop_inventory.updateMany({ where: { id: { in: partyB.offerItems } }, data: { userId: partyA.userId } });
      }

      return true;
    });
  }
}
