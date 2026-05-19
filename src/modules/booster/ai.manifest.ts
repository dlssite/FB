import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { BoosterService } from './services/BoosterService';

export const BoosterManifest: AiModuleManifest = {
  moduleName: 'Booster',
  actions: [
    {
      action: 'check_booster_status',
      description: 'Checks your server booster status and tier benefits.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'User ID to check.', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        
        // We need a member object for accurate boost detection
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetId).catch(() => null);
        
        const status = await BoosterService.getTierStatus(tenantId, guildId, targetId, member);
        const mults = BoosterService.getMultipliers(status.tier);
        
        let msg = `<@${targetId}> is at **Tier ${status.tier}** Booster status.`;
        if (status.tier > 0) {
          msg += `\nMultipliers: **x${mults.economy}** Economy, **x${mults.leveling}** Leveling.`;
        } else {
          msg += `\nBoost the server to unlock exclusive perks!`;
        }
        
        return { executed: true, result: msg };
      }
    }
  ]
};
