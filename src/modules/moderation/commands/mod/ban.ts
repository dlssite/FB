import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('ban')
      .setDescription('Bans a user from the server')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to ban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban')),
    
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');

    const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!targetUser) {
      return await replyV2(interaction, ContainerService.simple('❌ Target user not found.', { color: '#EA5455' }));
    }

    const target = await interaction.guild?.members.fetch(targetId).catch(() => null);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    // Hierarchy check (only applies if target is currently in the guild)
    if (target && target.roles && interaction.guild?.members.me && target.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
      return await replyV2(interaction, ContainerService.simple('❌ I cannot ban this user (Role Hierarchy).', { color: '#EA5455' }));
    }

    try {
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: target || targetUser,
        action: 'BAN',
        reason,
      });

      await replyV2(interaction, ContainerService.create({
        title: '✅ User Banned',
        description: `**${targetUser.tag}** has been banned.\n**Reason:** ${reason}`,
        color: '#EA5455',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to ban user: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
