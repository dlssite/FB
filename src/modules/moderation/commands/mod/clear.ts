import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('clear')
      .setDescription('Deletes a specific amount of messages')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const amount = interaction.options.getInteger('amount', true);

    if (!interaction.channel?.isTextBased()) return;

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.channel as any,
        action: 'CLEAR',
        reason: `Bulk delete ${amount} messages.`,
        duration: amount // Reusing duration field for amount in CLEAR action
      });
      
      await replyV2(interaction, ContainerService.create({
        title: '🧹 Channel Cleared',
        description: `Successfully deleted **${amount}** messages.`,
        color: '#7367F0',
        interaction
      }));
      
      const msg = await interaction.fetchReply().catch(() => null);
      if (msg) {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      }
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to clear messages: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
