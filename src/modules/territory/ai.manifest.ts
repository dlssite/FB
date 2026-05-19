import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { TerritoryRepository } from './database/TerritoryRepository';

export const TerritoryManifest: AiModuleManifest = {
  moduleName: 'Territory',
  actions: [
    {
      action: 'territory_list',
      description: 'Lists all registered nations and territories in the server. Use when asked what territories exist, what nations are registered, or for a general territory overview.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
        
        if (nations.length === 0) return { executed: true, result: 'No territories are currently registered in this realm.' };
        
        const list = nations.map(n => `- **${n.name}** (Resource: ${n.resourceName || 'None'}, Description: "${n.description || 'No description provided.'}")`).join('\n');
        return { executed: true, result: `Registered Territories:\n${list}` };
      }
    },
    {
      action: 'territory_info',
      description: 'Gets detailed information about a specific territory by name.',
      risk: RiskLevel.LOW,
      parameters: {
        name: { type: 'string', description: 'The name of the territory to look up.', required: true }
      },
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
        const nation = nations.find(n => n.name.toLowerCase().includes(params.name.toLowerCase()));
        
        if (!nation) return { executed: false, result: `Territory "${params.name}" not found.` };
        
        return {
          executed: true,
          result: `**Territory: ${nation.name}**\nResource: ${nation.resourceName || 'None'}\nBase Price: ${nation.resourceBasePrice || 0} Embers\nDescription: ${nation.description || 'No description provided.'}`
        };
      }
    },
    {
      action: 'get_citizen_territory',
      description: 'Shows which territory a citizen is currently located in or owns. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user ID to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId, interaction } = context;
        const targetId = params.userId || interaction.user.id;
        
        const territories = await TerritoryRepository.listByGuild(tenantId, guildId);
        const owned = territories.filter((t: any) => t.ownerId === targetId);
        
        if (owned.length === 0) return { executed: true, result: `<@${targetId}> does not currently own any territories.` };
        
        const list = owned.map((t: any) => `- **${t.name}**`).join('\n');
        return { executed: true, result: `<@${targetId}>'s Territories:\n${list}` };
      }
    }
  ]
};
