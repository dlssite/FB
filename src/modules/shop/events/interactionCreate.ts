import { Interaction, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ShopService } from '../services/ShopService';
import { shopRegistry } from '../catalog/engine/Registry';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';
import { RoutingService } from '../../../services/RoutingService';
import { InventoryService } from '../services/InventoryService';

export async function renderShopPanel(interaction: any, categoryId: string | null, catPage: number, itmPage: number) {
  await shopRegistry.loadCatalog();
  const categories = shopRegistry.getCategories();
  
  const catTotalPages = Math.ceil(categories.length / 25);
  const paginatedCategories = categories.slice(catPage * 25, (catPage + 1) * 25);

  const catSelect = new StringSelectMenuBuilder()
    .setCustomId(`shop_nav_cat_${catPage}`)
    .setPlaceholder(`📁 Switch Marketplace Department (Page ${catPage + 1}/${catTotalPages})...`)
    .addOptions(paginatedCategories.map(cat => ({
      label: cat.name,
      value: cat.identifier,
      emoji: cat.emoji || '📦',
      default: cat.identifier === categoryId,
    })));

  const rows: ActionRowBuilder<any>[] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(catSelect)];

  if (catTotalPages > 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_nav_pg_c_${catPage - 1}_${categoryId || 'none'}_${itmPage}`)
        .setLabel('◀ Categories')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(catPage === 0),
      new ButtonBuilder()
        .setCustomId(`shop_nav_pg_c_${catPage + 1}_${categoryId || 'none'}_${itmPage}`)
        .setLabel('Categories ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(catPage === catTotalPages - 1)
    ));
  }

  let category = null;
  let items: any[] = [];
  
  if (categoryId) {
    category = shopRegistry.getCategory(categoryId);
    items = shopRegistry.getItemsByCategory(categoryId);
  }

  if (items.length > 0) {
    const itmTotalPages = Math.ceil(items.length / 25);
    const paginatedItems = items.slice(itmPage * 25, (itmPage + 1) * 25);

    const itemSelect = new StringSelectMenuBuilder()
      .setCustomId('shop_nav_buy')
      .setPlaceholder(`🔥 Purchase with Embers from ${category?.name}...`)
      .addOptions(paginatedItems.map(t => ({
        label: t.name,
        description: `${t.basePrice.toLocaleString()} Embers — ${t.rarity.toUpperCase()}`,
        value: t.id,
        emoji: t.emoji || '◽',
      })));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(itemSelect));

    if (itmTotalPages > 1) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_nav_pg_i_${catPage}_${categoryId}_${itmPage - 1}`)
          .setLabel('◀ Items')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(itmPage === 0),
        new ButtonBuilder()
          .setCustomId(`shop_nav_pg_i_${catPage}_${categoryId}_${itmPage + 1}`)
          .setLabel('Items ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(itmPage === itmTotalPages - 1)
      ));
    }
  }

  return await replyV2(interaction, ContainerService.create({
    title: category ? `🛍️ ${category.name} Department` : '🏪 Global Marketplace Center',
    description: category?.description || 'Select a specialized department below to browse available assets.',
    color: category?.color || '#7367F0',
    image: category ? undefined : flamebornConfig.shop?.assets?.marketBanner,
    fields: items.slice(itmPage * 25, itmPage * 25 + 5).map(i => ({
      name: `${i.emoji || '📦'} ${i.name} — ${i.basePrice.toLocaleString()} Embers`,
      value: i.description || 'No info.',
    })),
    components: rows,
    interaction,
    footer: true,
  }));
}

export async function renderInventoryPanel(interaction: any, tenantId: string, guildId: string, userId: string, categoryId: string | null, page: number) {
  const allItems = await InventoryService.getHydratedCategoryItems(tenantId, guildId, userId);
  
  // 1. Resolve Unique Categories present in inventory
  const userCategories = Array.from(new Set(allItems.map(i => i.category)));
  await shopRegistry.loadCatalog();
  const categoryObjects = userCategories.map(id => shopRegistry.getCategory(id)).filter(Boolean);

  const rows: ActionRowBuilder<any>[] = [];

  // 2. Category Dropdown
  if (categoryObjects.length > 0) {
    const catSelect = new StringSelectMenuBuilder()
      .setCustomId('inv_nav_cat')
      .setPlaceholder('🎒 Filter Inventory by Department...')
      .addOptions(categoryObjects.map(cat => ({
        label: cat!.name,
        value: cat!.identifier,
        emoji: cat!.emoji || '📦',
        default: cat!.identifier === categoryId
      })));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(catSelect));
  }

  // 3. Paginate Items in selected category (or all if none)
  const filteredItems = categoryId ? allItems.filter(i => i.category === categoryId) : allItems;
  const totalPages = Math.ceil(filteredItems.length / 10);
  const paginatedItems = filteredItems.slice(page * 10, (page + 1) * 10);

  // 3. Item Actions (Use) Dropdown
  if (paginatedItems.length > 0) {
    const useSelect = new StringSelectMenuBuilder()
      .setCustomId('inv_use_item')
      .setPlaceholder('⚡ Select an item to use...')
      .addOptions(paginatedItems.map(item => ({
        label: item.name,
        description: `Condition: ${item.condition}%`,
        value: `${item.itemId}:${item.instanceId}`,
        emoji: '⚡'
      })));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(useSelect));
  }

  // 4. Pagination
  if (totalPages > 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_nav_pg_${categoryId || 'all'}_${page - 1}`)
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`inv_nav_pg_${categoryId || 'all'}_${page + 1}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1)
    ));
  }

  const category = categoryId ? shopRegistry.getCategory(categoryId) : null;

  return await replyV2(interaction, ContainerService.create({
    title: category ? `🎒 ${category.name} Inventory` : '🎒 Personal Inventory',
    description: paginatedItems.length > 0 
      ? `Displaying **${paginatedItems.length}** assets from your collection.`
      : 'Your backpack is currently empty in this department.',
    color: category?.color || '#4CD964',
    fields: paginatedItems.map(i => ({
      name: `${i.name} [${i.rarity.toUpperCase()}]`,
      value: `Condition: **${i.condition}%** • Acquired: <t:${Math.floor(i.acquiredAt.getTime() / 1000)}:R>`,
      inline: false
    })),
    components: rows,
    interaction,
    footer: true
  }));
}

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    // Always resolve for 'economy' to ensure we use the correct balance silo
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // --- PERSISTENT NAVIGATION: CATEGORY SWITCH ---
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('shop_nav_cat')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const catPage = parseInt(interaction.customId.split('_').pop() || '0', 10);
      const categoryId = interaction.values[0];
      return renderShopPanel(interaction, categoryId, catPage, 0);
    }

    // --- PERSISTENT NAVIGATION: PAGINATION BUTTONS ---
    if (interaction.isButton() && interaction.customId.startsWith('shop_nav_pg_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const parts = interaction.customId.split('_');
      // Format C: shop_nav_pg_c_{catPage}_{categoryId}_{itmPage}
      // Format I: shop_nav_pg_i_{catPage}_{categoryId}_{itmPage}
      const type = parts[3];
      const catPage = parseInt(parts[4], 10);
      const categoryId = parts[5] === 'none' ? null : parts[5];
      const itmPage = parseInt(parts[6], 10);
      
      return renderShopPanel(interaction, categoryId, catPage, itmPage);
    }

    // --- PURCHASE ACTION ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'shop_nav_buy') {
      // Ephemeral reply for the purchase result
      try { await (interaction as any).deferReply({ flags: MessageFlags.Ephemeral }); } catch (e) { return; }

      const itemId = interaction.values[0];
      const result = await ShopService.purchaseItem(tenantId, guildId, interaction.user.id, itemId);

      if (result.success) {
        return await replyV2(interaction, ContainerService.create({
          title: '✅ Purchase Successful',
          description: `You bought: **${result.itemName}**\nRemaining Balance: **${result.remainingBalance?.toLocaleString()}** Embers.`,
          color: '#2ECC71',
          footer: true,
          interaction
        }), true);
      } else {
        return await replyV2(interaction, ContainerService.create({
          title: '❌ Purchase Failed',
          description: `Reason: ${result.error}`,
          color: '#E74C3C',
          footer: true,
          interaction
        }), true);
      }
    }

    // --- INVENTORY NAVIGATION: CATEGORY SWITCH ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'inv_nav_cat') {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const categoryId = interaction.values[0];
      return renderInventoryPanel(interaction, tenantId, guildId, interaction.user.id, categoryId, 0);
    }

    // --- INVENTORY NAVIGATION: PAGINATION ---
    if (interaction.isButton() && interaction.customId.startsWith('inv_nav_pg_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const parts = interaction.customId.split('_');
      const categoryId = parts[3] === 'all' ? null : parts[3];
      const page = parseInt(parts[4], 10);
      return renderInventoryPanel(interaction, tenantId, guildId, interaction.user.id, categoryId, page);
    }

    // --- ITEM ACTION: USE ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'inv_use_item') {
      const [itemId, instanceId] = interaction.values[0].split(':');

      await shopRegistry.loadCatalog();
      const itemClass = shopRegistry.getItem(itemId);
      
      if (!itemClass) {
        try { await (interaction as any).deferUpdate(); } catch (e) {}
        return await replyV2(interaction, ContainerService.simple('❌ Item definition not found in registry.'), true);
      }

      // If the item does NOT open a modal, we must defer the update immediately to prevent gateway timeout
      if (!itemClass.opensModal) {
        try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      }

      const instance = await InventoryService.getHydratedInstance(instanceId);
      
      if (!instance) {
        if (itemClass.opensModal) {
          try { await (interaction as any).deferUpdate(); } catch (e) {}
        }
        return await replyV2(interaction, ContainerService.simple('❌ Item not found in database.'), true);
      }

      // Delegate the interaction to the item's custom onUse hook
      try {
        if (itemClass.onUse) {
          await itemClass.onUse(interaction, tenantId, guildId, interaction.user.id, instance);
        } else {
          if (itemClass.opensModal) {
            try { await (interaction as any).deferUpdate(); } catch (e) {}
          }
          return await replyV2(interaction, ContainerService.simple('❌ This item does not have a direct use action.'), true);
        }
      } catch (err: any) {
        console.error('[ActionEngine Error]:', err);
        if (itemClass.opensModal) {
          try { await (interaction as any).deferUpdate(); } catch (e) {}
        }
        return await replyV2(interaction, ContainerService.simple(`❌ Action failed: ${err.message}`), true);
      }
    }

    // --- ITEM ACTION: DEPLOY BUILDING ---
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('deploy_building_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      
      const instanceId = interaction.customId.replace('deploy_building_', '');
      const nationId = parseInt(interaction.values[0], 10);
      
      const { TerritoryBuildingService } = await import('../../territory/services/TerritoryBuildingService');
      const { TerritoryRepository } = await import('../../territory/database/TerritoryRepository');
      
      const instance = await InventoryService.getHydratedInstance(instanceId);
      if (!instance) return await replyV2(interaction, ContainerService.simple('❌ Deployment Error: Building kit not found.'));

      const nation = await TerritoryRepository.listByGuild(tenantId, guildId).then(list => list.find(n => n.id === nationId));
      if (!nation) return await replyV2(interaction, ContainerService.simple('❌ Deployment Error: Target nation not found.'));

      // 1. Register building in territory
      await TerritoryBuildingService.deployBuilding(tenantId, guildId, nationId, interaction.user.id, instance.itemId, instance.metadata);

      // 2. Consume kit from inventory
      const { prisma } = await import('../../../database/client');
      await prisma.shop_inventory.delete({ where: { id: instanceId } });

      return await replyV2(interaction, ContainerService.create({
        title: '🏗️ Infrastructure Deployed',
        description: `Successfully deployed **${instance.name}** in **${nation.name}**.\n\nYour infrastructure is now active and providing benefits to the region.`,
        color: '#F39C12',
        interaction,
        footer: true
      }));
    }
  },
};
