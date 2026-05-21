import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { ShopService } from './services/ShopService';
import { InventoryService } from './services/InventoryService';
import { ShopRegistry } from './catalog/engine/Registry';

export const ShopManifest: AiModuleManifest = {
  moduleName: 'Shop',
  actions: [
    {
      action: 'browse_shop',
      description: 'Lists all available items in the shop catalog. Can filter by category. Use this when a citizen asks what is for sale, what items exist, or wants to browse the shop.',
      risk: RiskLevel.LOW,
      parameters: {
        category: { type: 'string', description: 'Optional category filter (e.g. "vehicle", "tool", "consumable"). Leave empty for all items.', required: false }
      },
      handler: async (params, context) => {
        const shopRegistry = ShopRegistry.getInstance();
        await shopRegistry.loadCatalog(); // Ensure catalog is loaded from disk
        
        const items = params.category
          ? shopRegistry.getItemsByCategory(params.category)
          : shopRegistry.getItems();

        if (!items || items.length === 0) {
          if (params.category) {
            return { executed: true, result: `The **${params.category}** shop section is currently empty or that category doesn't exist. Try: equipment, survival, social, transportation, buildings, factions, streaks, music, or materials.` };
          }
          return { executed: true, result: 'The shop catalog appears to be empty at this time.' };
        }

        const preview = items.slice(0, 15).map((i: any) =>
          `- **${i.name}** (${i.rarity}) — ${(i.basePrice || 0).toLocaleString()} Embers${i.description ? ` — *${i.description}*` : ''} [ID: ${i.id}]`
        ).join('\n');

        return {
          executed: true,
          result: `Shop Catalog${params.category ? ` [${params.category}]` : ''} (${items.length} items):\n${preview}${items.length > 15 ? '\n*...and more*' : ''}`
        };
      }
    },
    {
      action: 'purchase_item',
      description: 'Purchases an item from the global catalog using Embers.',
      risk: RiskLevel.MEDIUM,
      parameters: {
        itemId: { type: 'string', description: 'The unique identifier/name of the item.', required: true }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const result = await ShopService.purchaseItem(tenantId, guildId, interaction.user.id, params.itemId);
        
        if (!result.success) {
          return { executed: false, result: `Transaction failed: ${result.error}` };
        }
        
        return {
          executed: true,
          result: `Successfully purchased **${result.itemName}** (${result.rarity})! Remaining balance: ${result.remainingBalance} Embers.`
        };
      }
    },
    {
      action: 'get_inventory',
      description: 'Lists the items in a user\'s inventory. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'User ID to check (defaults to requester).', required: false },
        category: { type: 'string', description: 'Filter by category (e.g. "vehicle", "tool").', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        
        const items = await InventoryService.getHydratedCategoryItems(tenantId, guildId, targetId, params.category);
        
        if (items.length === 0) {
          return { executed: true, result: `<@${targetId}>'s inventory is empty.` };
        }
        
        const itemList = items.slice(0, 10).map(i => `- **${i.name}** (${i.rarity}) [${i.condition}%]`).join('\n');
        const count = items.length;
        
        return {
          executed: true,
          result: `<@${targetId}>'s Inventory (${count} items):\n${itemList}${count > 10 ? '\n*...and more*' : ''}`
        };
      }
    },
    {
      action: 'use_item',
      description: 'Uses an item from your inventory.',
      risk: RiskLevel.MEDIUM,
      parameters: {
        itemName: { type: 'string', description: 'The name of the item to use.', required: true }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const items = await InventoryService.getHydratedCategoryItems(tenantId, guildId, interaction.user.id);
        const item = items.find(i => i.name.toLowerCase().includes(params.itemName.toLowerCase()));
        
        if (!item) return { executed: false, result: `Item "${params.itemName}" not found in your inventory.` };
        
        const { shopRegistry } = require('./catalog/engine/Registry');
        await shopRegistry.loadCatalog(); // Ensure catalog is loaded from disk
        const itemClass = shopRegistry.getItem(item.itemId);
        
        if (itemClass?.onUse) {
           await itemClass.onUse(interaction, tenantId, guildId, interaction.user.id, item);
           return { executed: true, result: `Used item: **${item.name}**.` };
        }
        
        return { executed: false, result: `Item **${item.name}** does not have a "Use" function.` };
      }
    }
  ]
};
