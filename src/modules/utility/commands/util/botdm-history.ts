import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { BotDMService } from '../../services/BotDMService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('botdm-history')
      .setDescription('📧 Admin: View recent bot DM broadcasts'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

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

    const broadcasts = await BotDMService.getBroadcastHistory(context.tenantId, context.guildId, 10);

    if (broadcasts.length === 0) {
      return await replyV2(
        interaction,
        ContainerService.simple(
          '📭 No DM broadcasts found yet.',
          { color: '#7367F0' }
        )
      );
    }

    // Build history field
    const historyLines = broadcasts.map((b, idx) => {
      const date = new Date(b.createdAt).toLocaleDateString();
      const targetLabel = 
        b.targetType === 'all' ? '👥 All'
        : b.targetType === 'role' ? '🎭 Role'
        : '👤 Specific';
      const status = b.status === 'completed' ? '✅' : b.status === 'in_progress' ? '⏳' : '⏸️';
      const successRate = b.totalRecipients > 0
        ? Math.round((b.successCount / b.totalRecipients) * 100)
        : 0;

      return `**#${b.id}** ${status} | ${targetLabel} | ${date} | Success: ${successRate}% (${b.successCount}/${b.totalRecipients})`;
    });

    const container = ContainerService.create({
      title: '📧 DM Broadcast History',
      description: historyLines.join('\n'),
      fields: [
        {
          name: '📖 Legend',
          value: '✅ Completed | ⏳ In Progress | ⏸️ Pending\n👥 All Members | 🎭 Role Filter | 👤 Specific Users'
        }
      ],
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
