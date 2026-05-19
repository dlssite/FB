import { prisma } from '../../../database/client';
import { ShopRepository } from '../database/ShopRepository';
import { shopRegistry } from '../catalog/engine/Registry';
import { Logger } from '../../../utils/logger';

export class AuctionService {
  /**
   * Starts a new auction for an item instance.
   */
  static async startAuction(tenantId: string, guildId: string, sellerId: string, inventoryId: string, startingBid: number, durationHours: number) {
    const instance = await ShopRepository.getInventoryInstance(inventoryId);
    if (!instance || instance.userId !== sellerId) throw new Error('You do not own this item.');

    // Check tradability from Registry
    await shopRegistry.loadCatalog();
    const itemDef = shopRegistry.getItem(instance.itemIdentifier);
    if (itemDef?.metadata?.isTradeable === false) {
      throw new Error('This item is bound to your account and cannot be auctioned.');
    }

    const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    return await prisma.shop_auctions.create({
      data: {
        tenantId,
        guildId,
        inventoryId: instance.id,
        sellerId,
        startingBid,
        currentBid: startingBid,
        endTime,
        status: 'active'
      }
    });
  }

  /**
   * Processes all expired auctions and resolves them.
   */
  static async processExpiredAuctions() {
    const expired = await prisma.shop_auctions.findMany({
      where: {
        status: 'active',
        endTime: { lte: new Date() }
      }
    });

    for (const auction of expired) {
      try {
        await this.resolveAuction(auction.id);
      } catch (err: any) {
        Logger.error(`[AUCTION] Failed to resolve auction ${auction.id}: ${err.message}`);
      }
    }
  }

  /**
   * Resolves a single auction.
   */
  static async resolveAuction(auctionId: number) {
    const auction = await prisma.shop_auctions.findUnique({ where: { id: auctionId } });
    if (!auction || auction.status !== 'active') return;

    return await prisma.$transaction(async (tx) => {
      if (auction.highestBidder) {
        // Winner found! Transfer item
        await tx.shop_inventory.update({
          where: { id: auction.inventoryId },
          data: { userId: auction.highestBidder }
        });

        // Pay seller (Current bid goes to seller)
        await tx.flameborn_users.update({
          where: { userId_tenantId: { userId: auction.sellerId, tenantId: auction.tenantId } },
          data: { embers: { increment: BigInt(auction.currentBid) } }
        });

        Logger.info(`[AUCTION] Resolved: Auction ${auction.id} won by ${auction.highestBidder} for ${auction.currentBid}.`);
      } else {
        Logger.info(`[AUCTION] Resolved: Auction ${auction.id} ended with no bids. Item remains with seller.`);
      }

      // Close auction
      await tx.shop_auctions.update({
        where: { id: auctionId },
        data: { status: 'completed' }
      });
    });
  }
}
