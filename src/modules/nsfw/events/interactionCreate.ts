import { Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { NsfwApi } from '../helpers/api';
import { NsfwService } from '../services/NsfwService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';

const CATEGORY_OPTIONS = [
  { label: 'Hentai', value: 'hentai', emoji: '🔞' },
  { label: 'Sex (Real)', value: 'sex', emoji: '👩‍❤️‍👨' },
  { label: 'FFM (3way)', value: 'ffm', emoji: '👩‍👩‍👦' },
  { label: 'MMF (3way)', value: 'mmf', emoji: '👨‍👨‍👧' },
  { label: 'Ass', value: 'ass', emoji: '🍑' },
  { label: 'Boobs', value: 'boobs', emoji: '🍉' },
  { label: 'Pussy', value: 'pussy', emoji: '🐱' },
  { label: 'BDSM', value: 'bdsm', emoji: '⛓️' }
];

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.guild) return;

    const tenantId = flamebornConfig.bot.tenant.id;

    // 1. Handle Next/Refresh Button
    if (interaction.isButton() && interaction.customId.startsWith('nsfw_next_')) {
      const category = interaction.customId.replace('nsfw_next_', '');
      await interaction.deferUpdate();

      const mediaUrl = await NsfwApi.fetchRandom(category);
      if (!mediaUrl) return;

      await NsfwService.incrementViews(interaction.user.id, tenantId);

      // Update Controls with new URL
      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`nsfw_prev_${category}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId(`nsfw_next_${category}`).setLabel('➡️ Next Content').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`nsfw_fav_${category}`).setLabel('❤️ Favorite').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setLabel('🔗 Source').setStyle(ButtonStyle.Link).setURL(mediaUrl)
      );

      const categorySelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('nsfw_category_switch')
          .setPlaceholder('Switch Category...')
          .addOptions(CATEGORY_OPTIONS)
      );

      const container = ContainerService.create({
        title: `NSFW Browser: ${category.toUpperCase()}`,
        media: [mediaUrl],
        color: '#ff79c6',
        footer: true,
        interaction,
        components: [controls, categorySelect]
      });

      return await replyV2(interaction as any, container);
    }

    // 2. Handle Category Switch
    if (interaction.isStringSelectMenu() && interaction.customId === 'nsfw_category_switch') {
      const category = interaction.values[0];
      await interaction.deferUpdate();

      const mediaUrl = await NsfwApi.fetchRandom(category);
      if (!mediaUrl) return;

      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`nsfw_prev_${category}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId(`nsfw_next_${category}`).setLabel('➡️ Next Content').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`nsfw_fav_${category}`).setLabel('❤️ Favorite').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setLabel('🔗 Source').setStyle(ButtonStyle.Link).setURL(mediaUrl)
      );

      const categorySelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('nsfw_category_switch')
          .setPlaceholder('Switch Category...')
          .addOptions(CATEGORY_OPTIONS)
      );

      const container = ContainerService.create({
        title: `NSFW Browser: ${category.toUpperCase()}`,
        media: [mediaUrl],
        color: '#ff79c6',
        footer: true,
        interaction,
        components: [controls, categorySelect]
      });

      return await replyV2(interaction as any, container);
    }

    // 3. Handle Favorite Button
    if (interaction.isButton() && interaction.customId.startsWith('nsfw_fav_')) {
      const message = interaction.message;
      const mediaUrl = message.embeds[0]?.image?.url;
      if (!mediaUrl) return;

      await interaction.deferReply({ ephemeral: true });

      const added = await NsfwService.toggleFavorite(interaction.user.id, tenantId, mediaUrl, 'NekoBot');
      
      const container = ContainerService.create({
        title: added ? 'Added to Vault' : 'Removed from Vault',
        description: added 
          ? '❤️ This media has been saved to your **NSFW Vault**.'
          : '💔 This media has been removed from your **NSFW Vault**.',
        color: added ? '#28C76F' : '#EA5455',
        footer: true,
        interaction
      });

      return await replyV2(interaction as any, container);
    }
  }
};
