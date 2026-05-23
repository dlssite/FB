import { Events, Message } from 'discord.js';
import { AutomodService } from '../services/AutomodService';
import { TenantRepository } from '../../../repositories/TenantRepository';
import { AddonService } from '../../../services/AddonService';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message) {
    // Optimization: Ignore bots immediately
    if (message.author.bot || !message.guild) return;

    // Resolve tenant context
    const tenantId = await TenantRepository.getTenantForGuild(message.guild.id) || process.env.TENANT_ID || 'tenant_alpha_01';
    
    // 1. Gatekeeper Check: Is Automod enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, message.guild.id, 'automod');
    if (!isEnabled) {
      console.log(`[Automod] Skipped: addon not enabled for guild ${message.guild.id}`);
      return;
    }

    // 2. Pass to Automod Pipeline
    try {
      const result = await AutomodService.processMessage(message, tenantId);
      if (result) {
        console.log(`[Automod] Message processed and action taken for user ${message.author.id}`);
      }
    } catch (error) {
      console.error(`[Automod] Error processing message:`, error);
    }
  },
};
