import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { ModerationRepository } from './database/ModerationRepository';

export const ModerationManifest: AiModuleManifest = {
  moduleName: 'Moderation',
  actions: [
    {
      action: 'mute_user',
      description: 'Admin only: Temporarily silences a user (timeout) in the server.',
      risk: RiskLevel.MEDIUM,
      parameters: {
        userId: { type: 'string', description: 'The raw Discord ID of the user to mute.', required: true },
        duration: { type: 'number', description: 'Duration in minutes (defaults to 10).', required: false },
        reason: { type: 'string', description: 'The reason for the mute.', required: false }
      },
      handler: async (params, context) => {
        const { interaction } = context;
        const guild = interaction?.guild;
        
        if (!guild) return { executed: false, result: 'Guild context missing.' };

        const { userId, duration, reason } = params;
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) return { executed: false, result: `User ${userId} not found.` };
        
        const minutes = parseInt(duration) || 10;
        await member.timeout(minutes * 60 * 1000, reason || 'Muted by AI');
        
        return {
          executed: true,
          result: `Successfully timed out **${member.user.tag}** for **${minutes} minutes**.`
        };
      }
    },
    {
      action: 'kick_user',
      description: 'Admin only: Removes a user from the server.',
      risk: RiskLevel.HIGH,
      parameters: {
        userId: { type: 'string', description: 'The raw Discord ID of the user to kick.', required: true },
        reason: { type: 'string', description: 'The reason for the kick.', required: false }
      },
      handler: async (params, context) => {
        const { interaction } = context;
        const guild = interaction?.guild;
        if (!guild) return { executed: false, result: 'Guild context missing.' };

        const { userId, reason } = params;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return { executed: false, result: `User ${userId} not found.` };

        await member.kick(reason || 'Kicked by AI');
        return { executed: true, result: `Successfully kicked **${member.user.tag}**.` };
      }
    },
    {
      action: 'check_warnings',
      description: 'Checks the moderation warnings/infractions for a citizen. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user ID to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        
        const warnings = await ModerationRepository.getUserWarnings(tenantId, guildId, targetId);
        
        if (!warnings || warnings.length === 0) {
          return { executed: true, result: `<@${targetId}> has a clean record. No warnings found.` };
        }
        
        const list = warnings.slice(0, 10).map((w: any) =>
          `- **${w.action}**: "${w.reason}" (Mod: <@${w.moderatorId}>)`
        ).join('\n');
        
        return { executed: true, result: `<@${targetId}> has **${warnings.length}** infractions:\n${list}` };
      }
    }
  ]
};
