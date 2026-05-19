import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InviteRepository } from '../../database/InviteRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('leaderboard')
       .setDescription('🏆 View the Top Inviters in the server.'),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    const leaderboard = await InviteRepository.getLeaderboard(context.tenantId, interaction.guild.id, 10);

    if (leaderboard.length === 0) {
      return replyV2(interaction, ContainerService.simple('There are no active inviters in this server yet.', { color: 'Blue' }));
    }

    let description = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < leaderboard.length; i++) {
      const rank = i < 3 ? medals[i] : `**#${i + 1}**`;
      const stats = leaderboard[i];
      description += `${rank} <@${stats.userId}> — **${stats.realInvites}** Real Invites\n*(+${stats.joins} Joins, -${stats.leaves} Leaves, -${stats.fake} Fakes)*\n\n`;
    }

    const container = ContainerService.create({
      title: '🏆 Top Inviters Leaderboard',
      description,
      color: '#FFD700',
      image: flamebornConfig.invite.assets.leaderboardBanner,
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
