import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { prisma } from '../../../database/client';
import { flamebornConfig } from '../../../config/flameborn.config';
import { ContainerService, replyV2 } from '../../../utils/container';
import { Logger } from '../../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('Manage the Advanced TempVoice Engine')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup(group =>
      group.setName('hub')
        .setDescription('Manage TempVoice Hubs (Admin Only)')
        .addSubcommand(sub =>
          sub.setName('create')
            .setDescription('Create a new TempVoice Hub')
            .addChannelOption(opt => opt.setName('trigger').setDescription('The voice channel users join to trigger creation').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
            .addChannelOption(opt => opt.setName('category').setDescription('The category where temp channels will spawn').setRequired(true).addChannelTypes(ChannelType.GuildCategory))
            .addStringOption(opt => opt.setName('name').setDescription('Hub Name').setRequired(true))
            .addIntegerOption(opt => opt.setName('cost').setDescription('Creation Cost in Embers').setRequired(false))
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('List all configured hubs')
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a TempVoice Hub')
            .addStringOption(opt => opt.setName('id').setDescription('Hub ID').setRequired(true))
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    const tenantId = flamebornConfig.bot.tenant.id;

    if (subcommandGroup === 'hub') {
      if (subcommand === 'create') {
        const trigger = interaction.options.getChannel('trigger', true);
        const category = interaction.options.getChannel('category', true);
        const name = interaction.options.getString('name', true);
        const cost = interaction.options.getInteger('cost') || 0;

        try {
          const hub = await prisma.tempvoice_hubs.create({
            data: {
              tenantId,
              guildId: interaction.guildId!,
              triggerChannelId: trigger.id,
              categoryId: category.id,
              hubName: name,
              creationCost: cost
            }
          });

          const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

          const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('tv_static_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('tv_static_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
            new ButtonBuilder().setCustomId('tv_static_hide').setLabel('Hide (Ghost)').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
            new ButtonBuilder().setCustomId('tv_static_show').setLabel('Show').setStyle(ButtonStyle.Secondary).setEmoji('👀')
          );

          const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('tv_static_rename').setLabel('Rename').setStyle(ButtonStyle.Primary).setEmoji('📝'),
            new ButtonBuilder().setCustomId('tv_static_limit').setLabel('Set Limit').setStyle(ButtonStyle.Primary).setEmoji('👥'),
            new ButtonBuilder().setCustomId('tv_static_transfer').setLabel('Transfer').setStyle(ButtonStyle.Danger).setEmoji('👑')
          );

          const container = ContainerService.create({
            title: `🎙️ ${name} Control Panel`,
            description: `Welcome to the **${name}** hub!\n\nJoin <#${trigger.id}> to automatically spawn your temporary voice channel.\n\nUse the buttons below to manage your room's privacy and settings. The system will automatically detect your active room.`,
            color: '#50fa7b',
            components: [row1, row2]
          });

          return await replyV2(interaction, container, false); // Not ephemeral, so it acts as the public panel
        } catch (err) {
          Logger.error('Failed to create hub', err);
          return interaction.editReply({ content: 'Failed to create hub.' }).catch(() => {});
        }
      }

      if (subcommand === 'list') {
        const hubs = await prisma.tempvoice_hubs.findMany({
          where: { tenantId, guildId: interaction.guildId! }
        });

        if (hubs.length === 0) {
          return interaction.reply({ content: 'No hubs configured.', flags: MessageFlags.Ephemeral });
        }

        const desc = hubs.map(h => `**${h.hubName}** (ID: \`${h.id}\`)\nTrigger: <#${h.triggerChannelId}> | Cost: ${h.creationCost}`).join('\n\n');

        const container = ContainerService.create({
          title: '🎙️ TempVoice Hubs',
          description: desc,
          color: '#8be9fd'
        });

        return await replyV2(interaction, container, true);
      }

      if (subcommand === 'remove') {
        const id = interaction.options.getString('id', true);
        try {
          await prisma.tempvoice_hubs.delete({
            where: { id }
          });
          return interaction.editReply({ content: 'Hub removed successfully.' }).catch(() => {});
        } catch (err) {
          return interaction.editReply({ content: 'Failed to remove hub or hub not found.' }).catch(() => {});
        }
      }
    }
  }
};
