import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('slowmode')
      .setDescription('Sets the slowmode for the current channel')
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode duration in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const seconds = interaction.options.getInteger('seconds', true);

    if (!interaction.channel || !('setRateLimitPerUser' in interaction.channel)) return;

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.channel as any,
        action: 'SLOWMODE',
        seconds: seconds,
        reason: seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to ${seconds}s.`
      });
      
      await replyV2(interaction, ContainerService.create({
        title: '🐌 Slowmode Updated',
        description: `This channel's slowmode has been set to **${seconds} seconds**.`,
        color: '#7367F0',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to set slowmode: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
