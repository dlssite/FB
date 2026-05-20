import { Message, Events } from 'discord.js';
import { LevelingService } from '../services/LevelingService';
import { tenantStorage } from '../../../utils/context';
import { TenantRepository } from '../../../repositories/TenantRepository';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    // 1. Resolve Tenant for this specific guild
    const tenantId = await TenantRepository.getTenantForGuild(message.guild!.id) || process.env.TENANT_ID || 'tenant_alpha_01';

    // 2. Initialize the context and process XP
    await tenantStorage.run({ tenantId, guildId: message.guild!.id, lang: 'en' }, async () => {
      await LevelingService.handleMessage(
        tenantId,
        message.guild!.id,
        message.author.id,
        message.channel.id,
        message.member
      );
    });
  }
};
