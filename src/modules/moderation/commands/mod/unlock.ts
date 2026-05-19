import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('unlock')
      .setDescription('Unlocks the current channel to allow members to speak'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    if (!interaction.guild || !interaction.channel || !('permissionOverwrites' in interaction.channel)) return;

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: interaction.channel as any,
        action: 'UNLOCK',
        reason: 'Channel unlocked by staff.'
      });

      await replyV2(interaction, ContainerService.create({
        title: '🔓 Channel Unlocked',
        description: `This channel has been unlocked.`,
        color: '#28C76F',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to unlock channel: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
