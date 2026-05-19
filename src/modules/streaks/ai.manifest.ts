import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { StreakRepository } from './database/StreakRepository';
import { StreakService } from './services/StreakService';

export const StreakManifest: AiModuleManifest = {
  moduleName: 'Streaks',
  actions: [
    {
      action: 'check_streak',
      description: 'Checks the daily claim streak for a citizen. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'User ID to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        const user = await StreakRepository.getUser(tenantId, guildId, targetId);
        
        return {
          executed: true,
          result: `<@${targetId}> is on a **${user.currentStreak} day** streak! (Longest: ${user.longestStreak})`
        };
      }
    },
    {
      action: 'streak_leaderboard',
      description: 'Shows the citizens with the longest active streaks. Use for streak rankings or "who has the highest streak" questions.',
      risk: RiskLevel.LOW,
      parameters: {
        limit: { type: 'number', description: 'How many top users to show (default 10).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const top = await StreakRepository.getTopStreaks(tenantId, guildId, params.limit || 10);
        
        if (!top || top.length === 0) return { executed: true, result: 'No streak data found for this realm.' };
        
        const board = top.map((u: any, i: number) =>
          `**${i + 1}.** <@${u.userId}> — **${u.currentStreak} day streak** (Longest: ${u.longestStreak})`
        ).join('\n');
        
        return { executed: true, result: `Streak Leaderboard:\n${board}` };
      }
    },
    {
      action: 'claim_streak',
      description: 'Claims the daily streak reward for the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { interaction, tenantId, guildId, channelId } = context;
        const result = await StreakService.claimStreak(tenantId, guildId, interaction.user.id, interaction.member, channelId);
        
        if (!result.success) {
          if (result.reason === 'COOLDOWN') return { executed: false, result: `Neural link on cooldown. Try again in **${Math.ceil(24 - (result.hoursSince || 0))} hours**.` };
          return { executed: false, result: 'Streak system is currently offline.' };
        }
        
        return {
          executed: true,
          result: `Streak claimed! Day **${result.streak}**. You earned **${result.rewards?.embers || 0}** Embers and **${result.rewards?.xp || 0}** XP.`
        };
      }
    }
  ]
};
