import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('kick')
      .setDescription('Kicks a user from the server')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to kick').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick')),
    
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
        action: 'KICK',
        reason,
      });

      await replyV2(interaction, ContainerService.create({
        title: '✅ User Kicked',
        description: `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`,
        color: '#F8D030',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to kick user: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
