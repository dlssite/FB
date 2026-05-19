import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InviteRepository } from '../../database/InviteRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('stats')
       .setDescription('📈 View invite statistics for yourself or another user.')
       .addUserOption(opt => opt.setName('user').setDescription('The user to view stats for.').setRequired(false)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const stats = await InviteRepository.getUserStats(context.tenantId, interaction.guild.id, targetUser.id);
    const joins = Number(stats.invites || 0);
    const leaves = Number(stats.leaves || 0);
    const fakes = Number(stats.fake || 0);
    const bonus = Number(stats.bonus || 0);
    const rejoins = Number(stats.rejoins || 0);
    
    const realInvites = joins + bonus - leaves - fakes;

    // Smart Analytics
    const retentionRate = joins > 0 ? Math.max(0, Math.min(100, ((joins - leaves) / joins) * 100)) : 100;
    const rejoinRate = joins > 0 ? (rejoins / joins) * 100 : 0;
    const fakeRate = joins > 0 ? (fakes / joins) * 100 : 0;

    // Quality Indicator
    let qualityEmoji = '📈';
    let qualityLabel = 'Healthy';
    if (retentionRate > 80 && fakeRate < 5) { qualityEmoji = '💎'; qualityLabel = 'Premium'; }
    else if (retentionRate < 40 || fakeRate > 20) { qualityEmoji = '⚠️'; qualityLabel = 'Volatile'; }
    else if (rejoinRate > 30) { qualityEmoji = '🔄'; qualityLabel = 'Cyclic'; }

    // Get Leaderboard rank
    const leaderboard = await InviteRepository.getLeaderboard(context.tenantId, interaction.guild.id, 100); 
    const rankIndex = leaderboard.findIndex(r => r.userId === targetUser.id);
    const rankDisplay = rankIndex >= 0 ? `#${rankIndex + 1}` : 'Unranked';

    const container = ContainerService.create({
      title: `Member Telemetry: ${targetUser.username}`,
      description: `**Total Real Invites: ${realInvites}**\n*(Rank: ${rankDisplay}  •  Growth Quality: ${qualityEmoji} ${qualityLabel})*`,
      color: '#00D8FF',
      thumbnail: targetUser.displayAvatarURL(),
      image: flamebornConfig.invite.assets.statsBanner,
      footer: true,
      fields: [
        { name: '✅ Regular Joins', value: `${joins} \`(${retentionRate.toFixed(1)}% Retention)\``, inline: true },
        { name: '❌ Leaves', value: `${leaves} \`(${(100 - retentionRate).toFixed(1)}% Attrition)\``, inline: true },
        { name: '🔄 Rejoins', value: `${rejoins} \`(${rejoinRate.toFixed(1)}% Return Rate)\``, inline: true },
        { name: '🤖 Fakes', value: `${fakes} \`(${fakeRate.toFixed(1)}% Ratio)\``, inline: true },
        { name: '🎁 Bonus', value: bonus.toString(), inline: true },
        { name: '📊 Net Performance', value: `\`${realInvites > 0 ? '+' : ''}${realInvites}\` Members Contribution`, inline: true }
      ],
      interaction
    });

    await replyV2(interaction, container);
  }
};
