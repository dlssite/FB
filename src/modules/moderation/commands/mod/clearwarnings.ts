import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('clearwarnings')
      .setDescription('Clears ALL warnings for a specific user')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to clear warnings for').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for clearing all warnings')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');

    const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!targetUser) {
      return await replyV2(interaction, ContainerService.simple('❌ Target user not found.', { color: '#EA5455' }));
    }

    const reason = interaction.options.getString('reason') || 'No reason provided.';

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: targetUser as any,
        action: 'CLEAR_WARNS',
        reason
      });

      await replyV2(interaction, ContainerService.create({
        title: '🧹 All Warnings Cleared',
        description: `Successfully cleared all warnings for **${targetUser.tag}**.\n**Reason:** ${reason}`,
        color: '#28C76F',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to clear warnings: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
