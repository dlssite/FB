import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { FactionRepository } from './database/FactionRepository';
import { WarBoardService } from './services/WarBoardService';
import { prisma } from '../../database/client';

export const FactionManifest: AiModuleManifest = {
  moduleName: 'Faction',
  actions: [
    {
      action: 'get_faction_summary',
      description: 'Provides a high-level summary of a citizen\'s Faction/Syndicate status, bank balance, and HQ. Defaults to speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The Discord ID of the user (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId, interaction } = context;
        const targetId = params.userId || interaction.user.id;
        
        const faction = await FactionRepository.getUserFaction(tenantId, guildId, targetId);
        if (!faction) return { executed: true, result: `<@${targetId}> is not currently affiliated with any Syndicate.` };

        const memberCount = await prisma.faction_members.count({ where: { factionId: faction.id } });
        
        return {
          executed: true,
          result: `**Syndicate:** ${faction.name}\n**Bank:** ${faction.bankBalance.toLocaleString()} Embers\n**Members:** ${memberCount}\n**HQ:** ${faction.hqTerritoryId ? 'Claimed' : 'None'}`
        };
      }
    },
    {
      action: 'list_factions',
      description: 'Lists all Syndicates/Factions currently operating in the realm. Use when asked about all factions, what syndicates exist, or faction count.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const factions = await prisma.factions.findMany({
          where: { tenantId, guildId },
          orderBy: { bankBalance: 'desc' }
        });
        
        if (!factions || factions.length === 0) return { executed: true, result: 'No Syndicates are currently active in this realm.' };
        
        const list = factions.map((f: any, i: number) =>
          `**${i + 1}.** ${f.name} — Bank: ${Number(f.bankBalance).toLocaleString()} Embers`
        ).join('\n');
        
        return { executed: true, result: `Active Syndicates (${factions.length}):\n${list}` };
      }
    },
    {
      action: 'check_war_board',
      description: 'Checks the active Syndicate Directive (Bounty) on the War Board for the speaking citizen\'s faction.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId, interaction } = context;
        
        const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);
        if (!faction) return { executed: false, result: 'You must be in a Faction to access the War Board.' };

        const bounty = await WarBoardService.getActiveBounty(tenantId, guildId, faction.id);
        
        return {
          executed: true,
          result: `**Active Directive:** ${bounty.description}\n**Progress:** ${bounty.currentAmount}/${bounty.targetAmount}\n**Reward:** ${bounty.rewardGp.toLocaleString()} Embers`
        };
      }
    },
    {
      action: 'check_vault',
      description: 'Lists the items currently stored in the speaking citizen\'s Faction Vault.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId, interaction } = context;
        const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);
        if (!faction) return { executed: false, result: 'You must be in a Faction to access the Vault.' };

        const vault = (faction.vault as any[]) || [];
        if (vault.length === 0) return { executed: true, result: 'The Faction Vault is currently empty.' };

        const items = vault.map(i => `- ${i.itemName} (x${i.quantity})`).join('\n');
        return {
          executed: true,
          result: `**Vault Inventory:**\n${items}`
        };
      }
    }
  ]
};
