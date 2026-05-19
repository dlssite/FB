import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { prisma } from '../../../database/client';
import { InventoryService } from '../../shop/services/InventoryService';

export class InventoryProfileProvider implements ProfileProvider {
  moduleName = 'inventory';
  priority = 35; // Appears right after economy

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    const [shopInv, regInv] = await Promise.all([
      InventoryService.getHydratedCategoryItems(tenantId, guildId, userId),
      prisma.inventories.findMany({
        where: { tenantId, userId },
        take: 5
      })
    ]);

    const rarityWeight: Record<string, number> = {
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1
    };

    const sortedShopInv = shopInv.sort((a, b) => (rarityWeight[b.rarity?.toLowerCase()] || 1) - (rarityWeight[a.rarity?.toLowerCase()] || 1));

    const shopItems = sortedShopInv.slice(0, 5).map(i => `• \`${i.name}\` (${i.rarity})`).join('\n');
    const regularItems = regInv.map(i => `• \`${i.itemName}\``).join('\n');

    let display = '';
    if (shopItems) display += `**Shop Items:**\n${shopItems}\n\n`;
    if (regularItems) display += `**Backpack Items:**\n${regularItems}\n\n`;
    if (!display) display = '*No items in inventory.*';

    return [
      {
        name: '🎒 Vault & Personal Inventory',
        value: display.trim(),
        inline: false
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    const [shopInv, regInv] = await Promise.all([
      InventoryService.getHydratedCategoryItems(tenantId, guildId, userId),
      prisma.inventories.findMany({
        where: { tenantId, userId }
      })
    ]);

    return {
      shopItems: shopInv.map(i => ({ name: i.name, identifier: i.itemId, rarity: i.rarity, condition: i.condition })),
      backpackItems: regInv.map(i => i.itemName),
      totalItems: shopInv.length + regInv.length
    };
  }
}
