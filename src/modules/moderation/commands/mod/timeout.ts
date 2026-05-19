import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('timeout')
      .setDescription('Times out a member for a specified duration')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to timeout').setRequired(true))
      .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the timeout')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');

    const target = await interaction.guild?.members.fetch(targetId).catch(() => null);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    if (!target) {
      return await replyV2(interaction, ContainerService.simple('❌ Target member not found in this server.', { color: '#EA5455' }));
    }

    // Hierarchy check
    if (target.roles && interaction.guild?.members.me && target.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
      return await replyV2(interaction, ContainerService.simple('❌ I cannot timeout this user (Role Hierarchy).', { color: '#EA5455' }));
    }

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target,
        action: 'TIMEOUT',
        reason: `${reason} (${duration}m)`,
        duration: duration * 60 * 1000 // Convert minutes to ms
      });

      await replyV2(interaction, ContainerService.create({
        title: '⏳ User Timed Out',
        description: `**${target.user.tag}** has been silenced for **${duration} minutes**.\n**Reason:** ${reason}`,
        color: '#FF9F43',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to timeout user: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
