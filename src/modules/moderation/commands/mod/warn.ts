import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('warn')
      .setDescription('Issues a formal warning to a user')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to warn').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');

    const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!targetUser) {
      return await replyV2(interaction, ContainerService.simple('❌ Target user not found.', { color: '#FF9F43' }));
    }

    const target = await interaction.guild?.members.fetch(targetId).catch(() => null);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    try {
      const report = await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: target || targetUser,
        action: 'WARN',
        reason
      });

      await replyV2(interaction, ContainerService.create({
        title: '⚠️ User Warned',
        description: `**${targetUser.tag}** has been warned.\n**Reason:** ${reason}`,
        color: '#FF9F43',
        footer: `Total Warnings: ${report.warningCount}`,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to warn user: ${error.message}`, { color: '#FF9F43' }));
    }
  },
};
