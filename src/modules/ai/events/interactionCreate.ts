import { Events, Interaction, MessageFlags } from 'discord.js';
import { RedisService } from '../../../services/RedisService';
import { ActionRouter } from '../services/ActionRouter';
import { ContainerService, replyV2 } from '../../../utils/container';
import { tenantStorage } from '../../../utils/context';
import { AddonService } from '../../../services/AddonService';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('ai_confirm_') && !customId.startsWith('ai_cancel_')) return;

    // We must defer immediately to keep the interaction alive
    await interaction.deferUpdate();

    const guildId = interaction.guildId;
    if (!guildId) return;

    const { RoutingService } = await import('../../../services/RoutingService');
    const tenantId = await RoutingService.resolveTenantId(guildId, 'ai');
    
    // Gatekeeper Check: Is AI enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'ai');
    if (!isEnabled) return;

    const isCancel = customId.startsWith('ai_cancel_');
    const confirmId = isCancel ? customId.replace('ai_cancel_', '') : customId.replace('ai_confirm_', '');
    const redisKey = `ai:confirm:${confirmId}`;

    const rawData = await RedisService.get(redisKey);
    if (!rawData) {
      const errorPayload = ContainerService.simple('❌ This confirmation has expired or is invalid.', { color: '#FF0000', interaction });
      return replyV2(interaction, errorPayload);
    }

    const data = JSON.parse(rawData);

    // Security: Only the original requester can confirm/cancel
    if (interaction.user.id !== data.userId) {
      await interaction.followUp({
        content: '❌ Only the person who triggered this action can confirm or cancel it.',
        ephemeral: true
      });
      return;
    }

    // Wrap in tenant context for execution
    await tenantStorage.run({ tenantId: data.tenantId, guildId: data.guildId, lang: 'en' }, async () => {
      if (isCancel) {
        const cancelPayload = ContainerService.simple('🚫 Action cancelled by user.', { color: '#808080', interaction });
        await replyV2(interaction, cancelPayload);
      } else {
        // Execute the action
        // We use a cast here because we know executeAction is private, 
        // but for this implementation we'll make it accessible or call a public wrapper
        const result = await ActionRouter.executeAction(
          { action: data.action, parameters: data.parameters }, 
          { interaction, tenantId: data.tenantId, guildId: data.guildId }
        );
        
        const successPayload = ContainerService.simple(`✅ **Action Executed**\n${result.result}`, { color: '#00FF00', interaction });
        await replyV2(interaction, successPayload);
      }

      // Cleanup Redis
      await RedisService.del(redisKey);
    });
  }
};
