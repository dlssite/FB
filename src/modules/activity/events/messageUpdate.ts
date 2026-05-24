import { Message } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';
import { RedisService } from '../../../services/RedisService';

export default {
  name: 'messageUpdate',
  async execute(oldMessage: Message, newMessage: Message) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;

    try {
      const guildId = newMessage.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      // Determine before content: prefer oldMessage (cache-aware), or fallback to Redis cache
      let beforeContent = oldMessage.content || null;
      if (!beforeContent) {
        const cacheKey = `activity:msgcache:${tenantId}:${newMessage.id}`;
        const cached = await RedisService.get(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            beforeContent = parsed.content || null;
          } catch {}
        }
      }

      // Only log when content actually changed
      if ((beforeContent || '') === (newMessage.content || '')) return;

      await ActivityLogService.sendServerLog(newMessage.guild, tenantId, 'message_update', {
        authorTag: newMessage.author?.tag,
        authorId: newMessage.author?.id,
        channelId: newMessage.channelId,
        channelName: newMessage.channel?.isTextBased() && 'name' in newMessage.channel ? newMessage.channel.name : undefined,
        before: beforeContent,
        after: newMessage.content || null
      });

      // Update cache with latest content for future events
      try {
        const cacheKey = `activity:msgcache:${tenantId}:${newMessage.id}`;
        const payload = JSON.stringify({ content: (newMessage.content || '').slice(0, 2000), authorTag: newMessage.author?.tag, authorId: newMessage.author?.id, channelId: newMessage.channelId });
        await RedisService.set(cacheKey, payload, 7 * 24 * 3600);
      } catch {}
    } catch (err) {
      console.error('[ACTIVITY MESSAGE UPDATE ERROR]', err);
    }
  }
};
