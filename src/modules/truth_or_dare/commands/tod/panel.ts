import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { TodRepository } from '../../database/TodRepository';
import { ContainerService, sendV2, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('panel')
      .setDescription('🎭 Send the permanent Truth or Dare Arena panel.'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const tenantId = flamebornConfig.bot.tenant.id;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.create({
        title: 'Permission Denied',
        description: '❌ You need **Manage Server** permissions to use this command.',
        color: '#EA5455',
        footer: true,
        interaction
      }));
    }

    const settings = await TodRepository.getSettings(tenantId, interaction.guild.id);
    const channelId = settings.panelChannelId || interaction.channelId;
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null) as any;

    if (!channel) {
      return await replyV2(interaction, ContainerService.create({
        title: 'Error',
        description: '❌ Could not find the designated panel channel.',
        color: '#EA5455',
        footer: true,
        interaction
      }));
    }

    // Build the Arena UI [ Truth ] [ OR ] [ Dare ]
    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('tod_truth_SOFT').setLabel('Truth').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tod_random_SOFT').setLabel('OR').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tod_dare_SOFT').setLabel('Dare').setStyle(ButtonStyle.Danger)
    );

    const levelSelector = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('tod_level_switch')
        .setPlaceholder('Change Intensity Tier...')
        .addOptions([
          { label: 'Soft', value: 'SOFT', emoji: '💡', description: 'Family friendly and safe.', default: true },
          { label: 'Party', value: 'PARTY', emoji: '🔥', description: 'Teasing and suggestive.' },
          { label: 'Spicy', value: 'SPICY', emoji: '🌶️', description: 'Adult and NSFW content.' }
        ])
    );

    const container = ContainerService.create({
      layout: 'tod',
      title: '🎭 Truth or Dare Arena',
      image: flamebornConfig.tod.assets.panelBanner,
      description: 'Select your path below. May the truth set you free, or the dare break you.\n\n**Current Tier:** `SOFT`',
      color: '#7367F0',
      footer: 'Tap a button to receive your challenge. Are you brave?',
      interaction,
      components: [controls, levelSelector]
    });

    try {
      await sendV2(channel, container);
      
      return await replyV2(interaction, ContainerService.create({
        title: 'Panel Sent',
        description: `✅ The Truth or Dare Arena panel has been posted to <#${channel.id}>.`,
        color: '#28C76F',
        footer: true,
        interaction
      }));
    } catch (err) {
      return await replyV2(interaction, ContainerService.create({
        title: 'Error',
        description: '❌ Failed to send the panel. Please check my channel permissions.',
        color: '#EA5455',
        footer: true,
        interaction
      }));
    }
  }
};
