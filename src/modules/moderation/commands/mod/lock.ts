import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('lock')
      .setDescription('Locks the current channel to prevent members from speaking'),
      
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
        action: 'LOCK',
        reason: 'Channel locked by staff.'
      });

      await replyV2(interaction, ContainerService.create({
        title: '🔒 Channel Locked',
        description: `This channel has been locked.`,
        color: '#EA5455',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to lock channel: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
