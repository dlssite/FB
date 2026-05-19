import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { TransportationService } from './services/TransportationService';

export const TransportManifest: AiModuleManifest = {
  moduleName: 'Transportation',
  actions: [
    {
      action: 'travel_console',
      description: 'Opens the interactive travel console to move between nations.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { interaction, tenantId, guildId, userId } = context;
        if (!interaction || !interaction.editReply) return { executed: false, result: 'This action requires an active interaction context.' };
        
        await TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId);
        return { executed: true, result: 'Travel console deployed.' };
      }
    }
  ]
};
