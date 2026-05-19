import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { InviteRepository } from './database/InviteRepository';

export const InviteManifest: AiModuleManifest = {
  moduleName: 'Invite',
  actions: [
    {
      action: 'check_invites',
      description: 'Checks the invite statistics for a user. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'User ID to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        const stats = await InviteRepository.getUserStats(tenantId, guildId, targetId);
        
        const real = Number(stats.invites || 0) + Number(stats.bonus || 0) - Number(stats.leaves || 0) - Number(stats.fake || 0);
        
        return {
          executed: true,
          result: `<@${targetId}> has **${real}** real invites (**${stats.invites}** total, **${stats.leaves}** leaves, **${stats.fake}** fake).`
        };
      }
    },
    {
      action: 'invite_leaderboard',
      description: 'Shows the citizens who have invited the most people. Use for invite rankings or "who invited the most members" questions.',
      risk: RiskLevel.LOW,
      parameters: {
        limit: { type: 'number', description: 'How many top users to show (default 10).', required: false }
      },
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const top = await InviteRepository.getLeaderboard(tenantId, guildId, params.limit || 10);
        
        if (!top || top.length === 0) return { executed: true, result: 'No invite data found for this realm.' };
        
        const board = top.map((u: any, i: number) => {
          const real = Number(u.invites || 0) + Number(u.bonus || 0) - Number(u.leaves || 0) - Number(u.fake || 0);
          return `**${i + 1}.** <@${u.userId}> — **${real}** real invites`;
        }).join('\n');
        
        return { executed: true, result: `Invite Leaderboard:\n${board}` };
      }
    }
  ]
};
