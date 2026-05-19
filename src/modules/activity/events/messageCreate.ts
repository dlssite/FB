import { Message } from 'discord.js';
import { ActivityService } from '../services/ActivityService';
import { RoutingService } from '../../../services/RoutingService';
import { GuildService } from '../../../services/GuildService';

export default {
  name: 'messageCreate',
  async execute(message: Message) {
    // Prevent tracking bot activities
    if (message.author.bot || !message.guild) return;

    try {
      const guildId = message.guildId!;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      // 1. Analyze Message for specific telemetry metrics
      const content = message.content || '';
      
      // A. Media Attachments
      const media = message.attachments.size > 0 ? message.attachments.size : 0;

      // B. Custom & Unicode Emojis
      const customEmojiRegex = /<a?:[a-zA-Z0-9_]+:[0-9]+>/g;
      const unicodeEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      
      const customMatches = content.match(customEmojiRegex) || [];
      const unicodeMatches = content.match(unicodeEmojiRegex) || [];
      const emojis = customMatches.length + unicodeMatches.length;

      // C. URLs (Shared Links)
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urlMatches = content.match(urlRegex) || [];
      const links = urlMatches.length;

      // 2. Log to Activity Telemetry Service
      // Extract clean channel ID (resolve base ID for threads)
      const channelId = message.channel.isThread() ? message.channel.parentId! : message.channelId;

      await ActivityService.logMessageActivity(tenantId, guildId, message.author.id, channelId, {
        media,
        emojis,
        links
      });

      // 3. Track Command execution (Prefix check via per-guild settings)
      const settings = await GuildService.getSettings(tenantId, guildId);
      const prefix = settings?.prefix || '!';
      if (content.startsWith(prefix)) {
        await ActivityService.logCommandActivity(tenantId, guildId, message.author.id);
      }

    } catch (err) {
      console.error('[ACTIVITY TELEMETRY ERROR]', err);
    }
  }
};
