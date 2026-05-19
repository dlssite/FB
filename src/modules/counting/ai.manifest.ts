import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { CountingRepository } from './database/CountingRepository';

export const CountingManifest: AiModuleManifest = {
  moduleName: 'Counting',
  actions: [
    {
      action: 'check_counting_stats',
      description: 'Checks the current count, server record, and who last counted. Use for "what number are we on?" or "what\'s the counting record?"',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const settings = await CountingRepository.getSettings(tenantId, guildId);
        
        return {
          executed: true,
          result: `The current count is **${settings.currentCount}**. The all-time high is **${settings.highestCount}**! Last counter: <@${settings.lastUserId}>.`
        };
      }
    },
    {
      action: 'counting_leaderboard',
      description: 'Shows the citizens who have contributed the most to the counting channel. Use for "who counted the most?" or counting rankings.',
      risk: RiskLevel.LOW,
      parameters: {
        limit: { type: 'number', description: 'How many top users to show (default 10).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const top = await CountingRepository.getLeaderboard(tenantId, guildId, params.limit || 10);
        
        if (!top || top.length === 0) return { executed: true, result: 'No counting data found yet.' };
        
        const board = top.map((u: any, i: number) =>
          `**${i + 1}.** <@${u.userId}> — **${u.correctCounts}** correct counts`
        ).join('\n');
        
        return { executed: true, result: `Counting Leaderboard:\n${board}` };
      }
    },
    {
      action: 'counting_shameboard',
      description: 'Shows the citizens who have ruined the count the most times. Use for "who ruined the count?" or shame rankings.',
      risk: RiskLevel.LOW,
      parameters: {
        limit: { type: 'number', description: 'How many users to show (default 10).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const top = await CountingRepository.getShameboard(tenantId, guildId, params.limit || 10);
        
        if (!top || top.length === 0) return { executed: true, result: 'No shame data found yet.' };
        
        const board = top.map((u: any, i: number) =>
          `**${i + 1}.** <@${u.userId}> — ruined the count **${u.incorrectCounts}** times`
        ).join('\n');
        
        return { executed: true, result: `Shame Board:\n${board}` };
      }
    }
  ]
};
