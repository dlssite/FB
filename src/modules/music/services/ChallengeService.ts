import { MusicRepository } from '../database/MusicRepository';
import { EconomyRepository } from '../../economy/database/EconomyRepository';
import { LevelingService } from '../../leveling/services/LevelingService';
import { RedisService } from '../../../services/RedisService';

export class ChallengeService {
  private static CHALLENGE_KEY = 'music:challenges';

  /**
   * Gets the daily music challenges for a user.
   */
  static async getChallenges(tenantId: string, guildId: string, userId: string) {
    const stats = await MusicRepository.getUserStats(tenantId, guildId, userId);
    const listenHours = Number(stats.totalListenTime) / 3600;

    return [
      {
        id: 'melomaniac',
        name: 'Melomaniac',
        description: 'Listen to 5 hours of music in this server.',
        target: 5,
        current: listenHours,
        reward: 1000,
        completed: listenHours >= 5
      },
      {
        id: 'requester',
        name: 'Active Requester',
        description: 'Request 10 tracks to the queue.',
        target: 10,
        current: stats.tracksRequested,
        reward: 500,
        completed: stats.tracksRequested >= 10
      }
    ];
  }

  /**
   * Claims a challenge reward.
   */
  static async claimReward(tenantId: string, guildId: string, userId: string, challengeId: string) {
    const challenges = await this.getChallenges(tenantId, guildId, userId);
    const challenge = challenges.find(c => c.id === challengeId);

    if (!challenge || !challenge.completed) return { success: false, message: 'Challenge not completed yet!' };

    const claimedKey = `${this.CHALLENGE_KEY}:${userId}:${challengeId}`;
    const alreadyClaimed = await RedisService.get(claimedKey);
    if (alreadyClaimed) return { success: false, message: 'You have already claimed this reward!' };

    await EconomyRepository.updateBalance(tenantId, userId, { embers: challenge.reward });
    await LevelingService.addExperience(tenantId, guildId, userId, 500);
    await RedisService.set(claimedKey, 'claimed', 86400); // 24h expiry

    return { success: true, reward: challenge.reward };
  }
}
