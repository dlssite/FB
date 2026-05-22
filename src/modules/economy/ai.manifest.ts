import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { EconomyService } from './services/EconomyService';
import { EconomyRepository } from './database/EconomyRepository';

export const EconomyManifest: AiModuleManifest = {
  moduleName: 'Economy',
  actions: [
    {
      action: 'get_balance',
      description: 'Checks the current Embers balance of a user. Defaults to the speaking citizen if no userId is given.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The ID of the user to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId } = context;
        const targetId = params.userId || interaction.user.id;
        const user = await EconomyRepository.getUser(tenantId, targetId);
        const embers = Number(user?.embers || 0);
        const vault = Number(user?.emberVault || 0);
        const ruby = Number(user?.flamebornRuby || 0);
        
        return {
          executed: true,
          result: `<@${targetId}> — **${embers.toLocaleString()}** Embers | Vault: **${vault.toLocaleString()}** | Ruby: **${ruby.toLocaleString()}**`
        };
      }
    },
    {
      action: 'economy_leaderboard',
      description: 'Shows the richest citizens in the realm. Use when asked about the richest players, top balances, or wealth rankings.',
      risk: RiskLevel.LOW,
      parameters: {
        limit: { type: 'number', description: 'How many top users to show (default 10).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId } = context;
        const top = await EconomyRepository.getTopUsers(tenantId, params.limit || 10);
        
        if (!top || top.length === 0) return { executed: true, result: 'No economic data found for this realm.' };
        
        const board = top.map((u: any, i: number) =>
          `**${i + 1}.** <@${u.userId}> — ${Number(u.embers).toLocaleString()} Embers`
        ).join('\n');
        
        return { executed: true, result: `Ember Wealth Leaderboard:\n${board}` };
      }
    },
    {
      action: 'work',
      description: 'Performs a work shift to earn Embers.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { interaction, tenantId } = context;
        const result = await EconomyService.processWork(tenantId, interaction.user.id, interaction.channelId);
        
        if (!result.success) {
          return { executed: false, result: `You're exhausted! You can work again in **${result.message} minutes**.` };
        }
        
        return {
          executed: true,
          result: `You completed a shift as a **${result.job}** and earned **${result.amount}** Embers!`
        };
      }
    },
    {
      action: 'daily',
      description: 'Claims the daily citizenship reward.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const result = await EconomyService.claimDaily(tenantId, guildId, interaction.user.id, interaction.member);
        
        if (!result.success) {
          return { executed: false, result: `Neural link cooldown in effect. Check back in **${result.message} hours**.` };
        }
        
        return {
          executed: true,
          result: `Daily citizenship reward claimed! You received **${result.amount}** Embers.`
        };
      }
    },
    {
      action: 'manage_balance',
      description: 'Admin only: Modifies a user\'s balance (give, remove, set).',
      risk: RiskLevel.HIGH,
      parameters: {
        userId: { type: 'string', description: 'The target user ID.', required: true },
        amount: { type: 'number', description: 'The amount of embers.', required: true },
        type: { type: 'string', description: '"give", "remove", or "set".', required: true },
        reason: { type: 'string', description: 'Reason for the adjustment.', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, userContext } = context;
        
        // Permission check: only admins can use this
        if (!userContext?.isAdmin) {
          return {
            executed: false,
            result: '🚫 Only administrators can modify balances. This action requires elevated permissions.'
          };
        }
        
        const { userId, amount, type, reason } = params;
        
        await EconomyService.manageBalance(tenantId, userId, amount, type, reason || 'AI Administrative Adjustment');
        
        return {
          executed: true,
          result: `Successfully ${type}d **${amount}** Embers for <@${userId}>.`
        };
      }
    }
  ]
};
