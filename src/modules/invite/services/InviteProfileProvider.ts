import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { InviteRepository } from '../database/InviteRepository';

export class InviteProfileProvider implements ProfileProvider {
  moduleName = 'invite';
  priority = 80; // Appears after territory

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [];

    const [stats, rank] = await Promise.all([
      InviteRepository.getUserStats(tenantId, guildId, userId),
      InviteRepository.getUserRank(tenantId, guildId, userId)
    ]);
    const realInvites = Number(stats.invites || 0) + Number(stats.bonus || 0) - Number(stats.leaves || 0) - Number(stats.fake || 0);

    return [
      {
        name: `📈 Recruitment & Influence | Rank: \`#${rank > 0 ? rank : 'N/A'}\` ${rank === 1 ? '👑 (Top Recruiter)' : ''}`,
        value: `**Real Invites:** \`${realInvites}\`\n**Total Joins:** \`${stats.invites}\` | **Fake/Left:** \`${Number(stats.fake || 0) + Number(stats.leaves || 0)}\``,
        inline: true
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const stats = await InviteRepository.getUserStats(tenantId, guildId, userId);
    const realInvites = Number(stats.invites || 0) + Number(stats.bonus || 0) - Number(stats.leaves || 0) - Number(stats.fake || 0);

    return {
      realInvites,
      totalJoins: Number(stats.invites || 0),
      leaves: Number(stats.leaves || 0),
      fake: Number(stats.fake || 0),
      bonus: Number(stats.bonus || 0)
    };
  }
}
