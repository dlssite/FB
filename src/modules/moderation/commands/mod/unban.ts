import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('unban')
      .setDescription('Unbans a user from the server')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to unban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the unban')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    try {
      const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
      
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: (targetUser || { id: targetId }) as any,
        action: 'UNBAN',
        reason
      });

      await replyV2(interaction, ContainerService.create({
        title: '✅ User Unbanned',
        description: `**${targetUser ? targetUser.tag : `ID: ${targetId}`}** has been unbanned.\n**Reason:** ${reason}`,
        color: '#28C76F',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to unban user: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
