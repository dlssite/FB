import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { StreakRepository } from '../database/StreakRepository';

export class StreaksProfileProvider implements ProfileProvider {
  moduleName = 'streaks';
  priority = 30; // Appears after leveling

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return []; // Streaks are guild-scoped

    const [user, rank] = await Promise.all([
      StreakRepository.getUser(tenantId, guildId, userId),
      StreakRepository.getUserRank(tenantId, guildId, userId)
    ]);

    return [
      {
        name: `🔥 Daily Activity Streak | Rank: \`#${rank > 0 ? rank : 'N/A'}\` ${rank === 1 ? '👑 (Top Streaker)' : ''}`,
        value: `**Current Streak:** \`${user.currentStreak} days\`\n**Longest Streak:** \`${user.longestStreak} days\`\n**Freezes Used:** \`${user.freezesUsed || 0}\``,
        inline: true
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const user = await StreakRepository.getUser(tenantId, guildId, userId);

    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      freezesUsed: user.freezesUsed,
      lastClaimedAt: user.lastClaimedAt ? user.lastClaimedAt.toISOString() : null
    };
  }
}
