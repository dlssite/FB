import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { ProfileRepository } from './database/ProfileRepository';
import { ProfileService } from './services/ProfileService';

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
        const targetId = params.userId || context.userId;
        const tenantId = context.tenantId;
        const guildId = context.guildId || '';

        const profile = await ProfileRepository.getProfile(tenantId, targetId);
        const aiData = await ProfileService.getProfileAiData(tenantId, guildId, targetId);

        const summary = {
          identity: {
            bio: profile.bio || 'No bio set',
            adminTitle: profile.adminTitle || 'Wanderer',
            privacyMode: profile.privacyMode
          },
          moduleStatistics: aiData
        };

        return {
          executed: true,
          result: JSON.stringify(summary, (key, value) => typeof value === 'bigint' ? value.toString() : value)
        };
      }
    }
  ]
};
