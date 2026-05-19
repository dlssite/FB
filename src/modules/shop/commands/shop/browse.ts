import { SlashCommandSubcommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { shopRegistry } from '../../catalog/engine/Registry';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('browse')
      .setDescription('🛒 Browse the global marketplace catalog.')
      .addStringOption(opt => opt.setName('category').setDescription('Specific category to view')),

  async execute(interaction: any) {
    const { options } = interaction;
    const categoryQuery = options.getString('category');

    await shopRegistry.loadCatalog();
    const categories = shopRegistry.getCategories();

    if (!categories.length) {
      return await replyV2(interaction, ContainerService.simple('❌ No marketplace departments are currently active.'));
    }

    // 1. Persistent Category Selector (always present)
    const catPage = 0;
    const catTotalPages = Math.ceil(categories.length / 25);
    const paginatedCategories = categories.slice(catPage * 25, (catPage + 1) * 25);

    const catSelect = new StringSelectMenuBuilder()
      .setCustomId(`shop_nav_cat_${catPage}`)
      .setPlaceholder(`📁 Switch Marketplace Department (Page ${catPage + 1}/${catTotalPages})...`)
      .addOptions(paginatedCategories.map(cat => ({
        label: cat.name,
        value: cat.identifier,
        emoji: cat.emoji || '📦',
      })));

    const rows: ActionRowBuilder<any>[] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(catSelect)];

    if (catTotalPages > 1) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_nav_pg_c_${catPage - 1}_none_0`)
          .setLabel('◀ Categories')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(catPage === 0),
        new ButtonBuilder()
          .setCustomId(`shop_nav_pg_c_${catPage + 1}_none_0`)
          .setLabel('Categories ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(catPage === catTotalPages - 1)
      ));
    }

    // 2. If a category was pre-selected, show item selector immediately
    if (categoryQuery) {
      const category = shopRegistry.getCategory(categoryQuery);
      const items = shopRegistry.getItemsByCategory(categoryQuery);

      if (items.length > 0) {
        const itmPage = 0;
        const itmTotalPages = Math.ceil(items.length / 25);
        const paginatedItems = items.slice(itmPage * 25, (itmPage + 1) * 25);

        const itemSelect = new StringSelectMenuBuilder()
          .setCustomId('shop_nav_buy')
          .setPlaceholder(`🔥 Purchase with Embers from ${category?.name || 'Category'}...`)
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
              .setCustomId(`shop_nav_pg_i_${catPage}_${category?.identifier}_${itmPage - 1}`)
              .setLabel('◀ Items')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(itmPage === 0),
            new ButtonBuilder()
              .setCustomId(`shop_nav_pg_i_${catPage}_${category?.identifier}_${itmPage + 1}`)
              .setLabel('Items ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(itmPage === itmTotalPages - 1)
          ));
        }

        return await replyV2(interaction, ContainerService.create({
          title: `🛍️ ${category?.name} Department`,
          description: category?.description || 'Browsing available assets.',
          color: category?.color,
          fields: items.slice(0, 5).map(i => ({ name: `${i.emoji || '📦'} ${i.name} — ${i.basePrice.toLocaleString()} Embers`, value: i.description || 'No info.' })),
          components: rows,
          interaction,
          footer: true,
        }));
      }
    }

    // Default: Marketplace Hub
    return await replyV2(interaction, ContainerService.create({
      title: '🏪 Global Marketplace',
      description: 'Select a specialized department below to browse available assets.',
      color: '#7367F0',
      image: flamebornConfig.shop?.assets?.marketBanner,
      components: rows,
      interaction,
      footer: true,
    }));
  },
};
