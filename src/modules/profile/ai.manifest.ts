import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { ProfileRepository } from './database/ProfileRepository';
import { ProfileService } from './services/ProfileService';
import { ActionRouter } from '../ai/services/ActionRouter';

/**
 * Recursively convert user IDs to Discord mentions in the profile data
 */
function formatUserIdsAsMentions(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => formatUserIdsAsMentions(item));
  }
  
  const formatted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if this field looks like it contains a user ID
    if (key.toLowerCase().includes('id') && typeof value === 'string' && /^\d{15,}$/.test(value)) {
      // Convert raw ID to Discord mention
      formatted[key] = `<@${value}>`;
    } else if (typeof value === 'object' && value !== null) {
      formatted[key] = formatUserIdsAsMentions(value);
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
}

export const ProfileManifest: AiModuleManifest = {
  moduleName: 'Profile',
  actions: [
    {
      action: 'get_user_profile',
      description: 'Retrieves the complete aggregated identity and multi-module statistics of a citizen. Use this to understand who someone is, their wealth, level, streaks, and bio.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: {
          type: 'string',
          description: 'The Discord User ID of the citizen to inspect. Defaults to the speaker if omitted.',
          required: false
        }
      },
      handler: async (params, context) => {
        const targetId = params.userId || context.interaction?.user?.id || context.userId;
        const tenantId = context.tenantId;
        const guildId = context.guildId || '';

        const profile = await ProfileRepository.getProfile(tenantId, targetId);
        const aiData = await ProfileService.getProfileAiData(tenantId, guildId, targetId);

        // Get available actions for action registry
        const allActions = ActionRouter.getActions().map(a => ({
          action: a.action,
          description: a.description
        }));

        // Format profile data with user IDs converted to mentions
        const formattedAiData = formatUserIdsAsMentions(aiData);

        const summary = {
          identity: {
            bio: profile.bio || 'No bio set',
            title: profile.adminTitle || 'Citizen',
            privacyMode: profile.privacyMode
          },
          moduleStatistics: formattedAiData,
          availableActions: allActions
        };

        return {
          executed: true,
          result: JSON.stringify(summary, (key, value) => typeof value === 'bigint' ? value.toString() : value)
        };
      }
    }
  ]
};
