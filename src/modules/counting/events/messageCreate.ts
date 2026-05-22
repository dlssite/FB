import { Interaction, Message } from 'discord.js';
import { CountingService } from '../services/CountingService';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: 'messageCreate',
  async execute(message: Message) {
    if (message.author.bot || !message.guildId) return;

    // Resolve tenant & lang
    const tenantId = await RoutingService.resolveTenantId(message.guildId, 'counting');
    
    // Gatekeeper Check: Is Counting enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, message.guildId, 'counting');
    if (!isEnabled) return;
    
    const { GuildService } = await import('../../../services/GuildService');
    const { tenantStorage } = await import('../../../utils/context');
    const settings = await GuildService.getSettings(tenantId, message.guildId);
    const lang = settings?.lang || 'en';
    
    // Pass to service within context
    await tenantStorage.run({ tenantId, guildId: message.guildId!, lang }, async () => {
      await CountingService.handleCount(tenantId, message.guildId!, message.author.id, message.content, message);
    });
  },
};
