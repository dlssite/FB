import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { LiveDJService } from '../../services/LiveDJService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('livedj')
       .setDescription('🎧 Start a LiveDJ session to take exclusive control of the queue.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const userId = interaction.user.id;

    // Optional: Check if user has DJ Role (from settings) or is admin
    // For now, require ManageChannels or a specific DJ role (simplified)
    const activeDJ = await LiveDJService.getActiveDJ(guildId);

    if (activeDJ && activeDJ !== userId) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ LiveDJ Active',
        description: `There is already an active LiveDJ session hosted by <@${activeDJ}>.`,
        color: '#E74C3C',
        interaction
      }));
    }

    if (activeDJ === userId) {
      return await replyV2(interaction, ContainerService.create({
        title: 'ℹ️ Already Live',
        description: `You are already the active LiveDJ!`,
        color: '#3498DB',
        interaction
      }));
    }

    await LiveDJService.startSession(tenantId, guildId, userId, interaction.channelId);

    return await replyV2(interaction, ContainerService.create({
      title: '✅ Session Started',
      description: `Your LiveDJ session has been started. Check the chat for your control panel.`,
      color: '#2ECC71',
      interaction
    }), true); // Ephemeral confirmation
  }
};
