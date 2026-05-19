import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('untimeout')
      .setDescription('Removes a timeout from a member')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to untimeout').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the untimeout')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');

    const target = await interaction.guild?.members.fetch(targetId).catch(() => null);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    if (!target) {
      return await replyV2(interaction, ContainerService.simple('❌ Target member not found in this server.', { color: '#EA5455' }));
    }

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target,
        action: 'UNTIMEOUT',
        reason
      });

      await replyV2(interaction, ContainerService.create({
        title: '✅ Timeout Removed',
        description: `The timeout for **${target.user.tag}** has been removed.`,
        color: '#28C76F',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to remove timeout: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
