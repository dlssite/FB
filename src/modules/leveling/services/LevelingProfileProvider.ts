import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { LevelingRepository } from '../database/LevelingRepository';
import { LevelingService } from './LevelingService';

export class LevelingProfileProvider implements ProfileProvider {
  moduleName = 'leveling';
  priority = 20; // Appears after economy

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return []; // Leveling is guild-scoped

    const [user, rank] = await Promise.all([
      LevelingRepository.getUser(tenantId, guildId, userId),
      LevelingRepository.getUserRank(tenantId, guildId, userId)
    ]);

    const currentLevel = Number(user?.level || 1);
    const currentXp = Number(user?.xp || 0);
    const xpNeeded = LevelingService.getXpRequired(currentLevel);

    // Calculate progress bar
    const percent = Math.max(0, Math.min(Math.floor((currentXp / xpNeeded) * 10), 10));
    const bar = '█'.repeat(percent) + '░'.repeat(10 - percent);

    return [
      {
        name: `⭐ Neural Progression | Rank: \`#${rank > 0 ? rank : 'N/A'}\` ${rank === 1 ? '👑 (Top Neural Citizen)' : ''}`,
        value: `**Level:** \`${currentLevel}\`\n**XP:** \`${currentXp.toLocaleString()} / ${xpNeeded.toLocaleString()}\`\n\`${bar}\``,
        inline: false
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const [user, rank] = await Promise.all([
      LevelingRepository.getUser(tenantId, guildId, userId),
      LevelingRepository.getUserRank(tenantId, guildId, userId)
    ]);

    const currentLevel = Number(user?.level || 1);
    const currentXp = Number(user?.xp || 0);
    const xpNeeded = LevelingService.getXpRequired(currentLevel);

    return {
      level: currentLevel,
      xp: currentXp,
      xpNeeded,
      rank: rank > 0 ? rank : null
    };
  }
}
