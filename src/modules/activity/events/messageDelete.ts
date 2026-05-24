import { Message } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';
import { RedisService } from '../../../services/RedisService';

export default {
  name: 'messageDelete',
  async execute(message: Message) {
    if (!message.guild) return;
    if (message.author?.bot) return;

    try {
      const guildId = message.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      // If the message content isn't available (not cached), try Redis short-term cache
      let content = message.content || null;
      if (!content) {
        try {
          const cacheKey = `activity:msgcache:${tenantId}:${message.id}`;
          const cached = await RedisService.get(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            content = parsed.content || null;
          }
        } catch {}
      }

      await ActivityLogService.sendServerLog(message.guild, tenantId, 'message_delete', {
        authorTag: message.author?.tag,
        authorId: message.author?.id,
        channelId: message.channelId,
        channelName: message.channel?.isTextBased() && 'name' in message.channel ? message.channel.name : undefined,
        content
      });

      // Remove cached content after deletion
      try {
        const cacheKey = `activity:msgcache:${tenantId}:${message.id}`;
        await RedisService.del(cacheKey);
      } catch {}
    } catch (err) {
      console.error('[ACTIVITY MESSAGE DELETE ERROR]', err);
    }
  }
};
