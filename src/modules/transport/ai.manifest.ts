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
        
        // Check if we have the minimum context needed
        if (!interaction || (!interaction.editReply && !interaction.reply)) {
          return { executed: false, result: 'This action requires an active interaction context.' };
        }
        
        // If we don't have editReply but have reply (AI context), add a minimal editReply
        if (!interaction.editReply && interaction.reply) {
          interaction.editReply = interaction.reply; // Use reply as fallback
        }
        
        await TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId);
        return { executed: true, result: 'Travel console deployed.' };
      }
    }
  ]
};
