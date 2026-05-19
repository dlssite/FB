import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { NsfwApi, NSFW_CATEGORIES } from '../helpers/api';
import { NsfwService } from '../services/NsfwService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';

export default {
  data: new SlashCommandBuilder()
    .setName('nsfw')
    .setDescription('🔞 Advanced NSFW media browser')
    .setNSFW(true)
    .addStringOption(opt => 
      opt.setName('category')
        .setDescription('Initial category to browse')
        .setRequired(false)
        .addChoices(
          { name: 'Hentai', value: 'hentai' },
          { name: 'Sex (Real)', value: 'sex' },
          { name: 'FFM (3way)', value: 'ffm' },
          { name: 'MMF (3way)', value: 'mmf' },
          { name: 'Ass', value: 'ass' },
          { name: 'Boobs', value: 'boobs' },
          { name: 'Pussy', value: 'pussy' },
          { name: 'Thighs', value: 'thigh' }
        )
    )
    .addBooleanOption(opt => 
      opt.setName('private')
        .setDescription('Only show the browser to you?')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    // Security Check
    const channel = interaction.channel as any;
    if (!channel.nsfw) {
      return await replyV2(interaction, ContainerService.create({
        title: 'Safe Search Enabled',
        description: '❌ This command can only be used in **NSFW-enabled** channels.',
        color: '#EA5455',
        footer: true,
        interaction
      }));
    }

    const tenantId = flamebornConfig.bot.tenant.id;
    const initialCategory = interaction.options.getString('category') || 'hentai';
    
    // Fetch initial image
    const mediaUrl = await NsfwApi.fetchRandom(initialCategory);

    if (!mediaUrl) {
      return await interaction.editReply({ content: '❌ Failed to fetch content from providers. Please try again.' });
    }

    // Update Telemetry
    await NsfwService.incrementViews(interaction.user.id, tenantId);

    // Build Dashboard Components
    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`nsfw_prev_${initialCategory}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(`nsfw_next_${initialCategory}`).setLabel('➡️ Next Content').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`nsfw_fav_${initialCategory}`).setLabel('❤️ Favorite').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setLabel('🔗 Source').setStyle(ButtonStyle.Link).setURL(mediaUrl)
    );

    const categorySelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('nsfw_category_switch')
        .setPlaceholder('Switch Category...')
        .addOptions([
          { label: 'Hentai', value: 'hentai', emoji: '🔞' },
          { label: 'Sex (Real)', value: 'sex', emoji: '👩‍❤️‍👨' },
          { label: 'FFM (3way)', value: 'ffm', emoji: '👩‍👩‍👦' },
          { label: 'MMF (3way)', value: 'mmf', emoji: '👨‍👨‍👧' },
          { label: 'Ass', value: 'ass', emoji: '🍑' },
          { label: 'Boobs', value: 'boobs', emoji: '🍉' },
          { label: 'Pussy', value: 'pussy', emoji: '🐱' },
          { label: 'BDSM', value: 'bdsm', emoji: '⛓️' }
        ])
    );

    const container = ContainerService.create({
      title: `NSFW Browser: ${initialCategory.toUpperCase()}`,
      description: `Viewing content from Rule34 & NekoBot.`,
      media: [mediaUrl],
      color: '#ff79c6',
      footer: true,
      interaction,
      components: [controls, categorySelect]
    });

    return await replyV2(interaction, container);
  }
};
