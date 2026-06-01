import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import { BotDMService } from '../../services/BotDMService';
import { UtilityRepository } from '../../database/UtilityRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('botdm')
      .setDescription('📧 Admin: Send direct messages to users with role filtering')
      .addStringOption(opt =>
        opt
          .setName('target')
          .setDescription('Who to send DM to')
          .setRequired(true)
          .addChoices(
            { name: 'All Members', value: 'all' },
            { name: 'Specific Role', value: 'role' },
            { name: 'Specific Users', value: 'specific_users' }
          )
      )
      .addRoleOption(opt =>
        opt
          .setName('filter_role')
          .setDescription('Filter by role (for "Specific Role" option)')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt
          .setName('message')
          .setDescription('Message text to send (up to 2000 characters)')
          .setRequired(false)
          .setMaxLength(2000)
      )
      .addStringOption(opt =>
        opt
          .setName('media_url')
          .setDescription('URL to image or video (can add multiple by running command again)')
          .setRequired(false)
      )
      .addUserOption(opt =>
        opt
          .setName('user')
          .setDescription('Specific user to send to (for "Specific Users" option)')
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    // Check admin permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(
        interaction,
        ContainerService.create({
          title: '❌ Permission Denied',
          description: '⛔ Only server administrators can use this command.',
          color: '#EA5455',
          footer: true,
          interaction
        })
      );
    }

    const target = interaction.options.getString('target', true) as 'all' | 'role' | 'specific_users';
    const filterRole = interaction.options.getRole('filter_role');
    const message = interaction.options.getString('message');
    const mediaUrl = interaction.options.getString('media_url');
    const specificUser = interaction.options.getUser('user');

    // Validation
    if (!message && !mediaUrl) {
      return await replyV2(
        interaction,
        ContainerService.simple(
          '❌ Please provide either a message text or media URL.',
          { color: '#EA5455' }
        )
      );
    }

    if (target === 'role' && !filterRole) {
      return await replyV2(
        interaction,
        ContainerService.simple(
          '❌ Please specify a role to filter by when using "Specific Role" option.',
          { color: '#EA5455' }
        )
      );
    }

    if (target === 'specific_users' && !specificUser) {
      return await replyV2(
        interaction,
        ContainerService.simple(
          '❌ Please specify at least one user when using "Specific Users" option.',
          { color: '#EA5455' }
        )
      );
    }

    // Build parameters for broadcast
    const roleIds = target === 'role' && filterRole ? [filterRole.id] : [];
    const userIds = target === 'specific_users' && specificUser ? [specificUser.id] : [];
    const mediaUrls = mediaUrl ? [mediaUrl] : [];
    const messageText = message ?? undefined;

    // Send DM broadcast
    const result = await BotDMService.broadcastDM({
      tenantId: context.tenantId,
      guildId: context.guildId,
      broadcasterId: interaction.user.id,
      targetType: target,
      roleIds,
      userIds,
      messageText,
      mediaUrls,
      guild: interaction.guild!
    });

    // Send confirmation
    const successRate = result.totalRecipients > 0
      ? Math.round((result.successCount / result.totalRecipients) * 100)
      : 0;

    const targetDescription = 
      target === 'all' ? 'All members'
      : target === 'role' ? `Members with ${filterRole?.name} role`
      : `Specific user(s)`;

    const container = ContainerService.create({
      title: '✅ DM Broadcast Sent Successfully',
      color: '#28C76F',
      fields: [
        { name: '👥 Target', value: targetDescription },
        { name: '📊 Statistics', value: `**Total:** ${result.totalRecipients}\n**Success:** ${result.successCount} ✅\n**Failed:** ${result.failureCount} ❌\n**Success Rate:** ${successRate}%` },
        { name: '📝 Content', value: `${message ? '✓ Text Message' : ''}${message && mediaUrls.length > 0 ? '\n' : ''}${mediaUrls.length > 0 ? `✓ ${mediaUrls.length} Media File(s)` : ''}` },
        { name: '🔖 Broadcast ID', value: `\`#${result.broadcastId}\`` }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
