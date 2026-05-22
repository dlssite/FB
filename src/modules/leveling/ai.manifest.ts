import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { LevelingRepository } from './database/LevelingRepository';
import { LevelingService } from './services/LevelingService';

export const LevelingManifest: AiModuleManifest = {
  moduleName: 'Leveling',
  actions: [
    {
      action: 'get_level',
      description: 'Checks a user\'s current level and XP progress. Defaults to the speaking citizen if no userId given.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        const user = await LevelingRepository.getUser(tenantId, guildId, targetId);
        
        if (!user) return { executed: false, result: 'No leveling data found for this user.' };
        
        const level = Number(user.level || 1);
        const xp = Number(user.xp || 0);
        const nextXp = LevelingService.getXpRequired(level);
        
        return {
          executed: true,
          result: `<@${targetId}> is **Level ${level}** (${xp}/${nextXp} XP).`
        };
      }
    },
    {
      action: 'level_leaderboard',
      description: 'Shows the top ranked citizens by level and XP. Use when asked about the highest level players, ranking, or level leaderboard.',
      risk: RiskLevel.LOW,
      parameters: {
        limit: { type: 'number', description: 'How many top users to show (default 10).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const top = await LevelingRepository.getTopLevelers(tenantId, guildId, params.limit || 10);
        
        if (!top || top.length === 0) return { executed: true, result: 'No ranking data found for this realm.' };
        
        const board = top.map((u: any, i: number) =>
          `**${i + 1}.** <@${u.userId}> — Level **${u.level}** (${Number(u.xp).toLocaleString()} XP)`
        ).join('\n');
        
        return { executed: true, result: `Level Leaderboard:\n${board}` };
      }
    },
    {
      action: 'manage_xp',
      description: 'Admin only: Awards XP to a user.',
      risk: RiskLevel.MEDIUM,
      parameters: {
        userId: { type: 'string', description: 'Target user ID.', required: true },
        amount: { type: 'number', description: 'XP amount to add.', required: true }
      },
      handler: async (params, context) => {
        const { tenantId, guildId, userContext } = context;
        
        // Permission check: only admins can award XP
        if (!userContext?.isAdmin) {
          return {
            executed: false,
            result: '🚫 Only administrators can award XP. This action requires elevated permissions.'
          };
        }
        
        const { userId, amount } = params;
        
        await LevelingService.addExperience(tenantId, guildId, userId, amount);
        
        return {
          executed: true,
          result: `Successfully awarded **${amount} XP** to <@${userId}>.`
        };
      }
    }
  ]
};
