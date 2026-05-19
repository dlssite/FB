import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('unwarn')
      .setDescription('Removes a specific warning case from a user')
      .addIntegerOption(opt => opt.setName('case').setDescription('The ID of the warning case to remove').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for removing the warning')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const caseId = interaction.options.getInteger('case', true);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: { id: '0' } as any, // ID will be found by service from caseId
        action: 'UNWARN',
        reason: `Case #${caseId}: ${reason}`,
        caseId
      });

      await replyV2(interaction, ContainerService.create({
        title: '✅ Warning Removed',
        description: `Warning **#${caseId}** has been removed.`,
        color: '#28C76F',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to remove warning: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
