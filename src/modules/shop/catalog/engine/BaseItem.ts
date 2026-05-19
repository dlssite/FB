import { ShopItem, Rarity } from './Types';

/**
 * Base class that all marketplace items should extend.
 * Provides default implementations for optional hooks.
 */
export abstract class BaseItem implements ShopItem {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract basePrice: number;
  abstract rarity: Rarity;
  abstract category: string;
  
  emoji?: string;
  image?: string;
  metadata?: Record<string, any> = {};
  opensModal?: boolean;

  /**
   * Default requirement check: always allowed unless overridden.
   */
  async requirements(user: any, guild: any): Promise<{ success: boolean; reason?: string }> {
    return { success: true };
  }

  /**
   * Default post-purchase hook: no-op.
   */
  async onPurchase(user: any, guild: any, instance: any): Promise<void> {
    // Override in subclass for custom side-effects
  }

  /**
   * Universal Use hook: triggered when a user selects "Use Item" from their inventory.
   */
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../utils/container');
    await replyV2(interaction, ContainerService.simple('❌ This item does not have a direct use action.'));
  }

  /**
   * Default custom render hook: no-op.
   */
  onRender(builder: any): void {
    // Override to modify the UI container/embed for this specific item
  }
}
