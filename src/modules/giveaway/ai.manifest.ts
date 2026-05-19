import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { GiveawayRepository } from './database/GiveawayRepository';

export const GiveawayManifest: AiModuleManifest = {
  moduleName: 'Giveaway',
  actions: [
    {
      action: 'list_giveaways',
      description: 'Lists all active giveaways currently running in the server. Use for "are there any giveaways?" or "what giveaways are active?"',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const giveaways = await GiveawayRepository.getActiveGiveawaysByGuild(tenantId, guildId);
        
        if (giveaways.length === 0) return { executed: true, result: 'There are no active giveaways at the moment.' };
        
        const list = await Promise.all(giveaways.map(async (g) => {
          const entryCount = await GiveawayRepository.getEntryCount(g.id);
          const ends = g.endTime ? `<t:${Math.floor(g.endTime.getTime() / 1000)}:R>` : 'Unknown';
          return `- **${g.prize}** — ${entryCount} entries — Ends ${ends}`;
        }));
        
        return { executed: true, result: `Active Giveaways (${giveaways.length}):\n${list.join('\n')}` };
      }
    },
    {
      action: 'giveaway_history',
      description: 'Shows recently ended giveaways in the server.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const all = await GiveawayRepository.getGiveawaysByGuild(tenantId, guildId);
        const ended = all.filter((g: any) => g.ended).slice(0, 10);
        
        if (ended.length === 0) return { executed: true, result: 'No giveaway history found.' };
        
        const list = ended.map((g: any) => {
          const winners = Array.isArray(g.winners) && g.winners.length > 0
            ? g.winners.map((w: string) => `<@${w}>`).join(', ')
            : 'No winner';
          return `- **${g.prize}** → ${winners}`;
        }).join('\n');
        
        return { executed: true, result: `Recent Giveaway History:\n${list}` };
      }
    }
  ]
};
