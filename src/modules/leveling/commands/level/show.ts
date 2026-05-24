import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('show')
       .setDescription('🔎 Show the current leveling configuration for this server'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.simple('❌ You need Manage Server permission to view leveling settings.'));
    }

    const settings = await LevelingRepository.getSettings(context.tenantId, context.guildId) || await LevelingRepository.initSettings(context.tenantId, context.guildId);

    const announcementChannel = settings.levelingChannelId ? `<#${settings.levelingChannelId}>` : 'Current channel';
    const announcementStyle = settings.levelingImageEnabled ? 'Canvas image announcement' : 'Plain text announcement';
    const messageTemplate = settings.levelingMessage || 'GG {user.mention}, you reached level **{user.level}**!';
    const reactionEmoji = settings.levelingReaction || 'None';

    const description = [
      `**Announcement Channel:** ${announcementChannel}`,
      `**Announcement Style:** ${announcementStyle}`,
      `**Announcement Template:** ${messageTemplate}`,
      `**Reaction Emoji:** ${reactionEmoji}`,
      `**XP Message Enabled:** ${settings.messageXpEnabled ? 'Yes' : 'No'}`,
      `**Leveling Cooldown:** ${settings.messageXpCooldown || 0}s`
    ].join('\n');

    const response = ContainerService.create({
      title: 'Leveling Settings',
      description,
      color: '#28C76F',
      interaction,
      footer: true
    });

    await replyV2(interaction, response);
  }
};
