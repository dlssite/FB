import { Channel, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'channelCreate',
  async execute(channel: Channel) {
    if (!('guild' in channel) || !channel.guild) return;

    try {
      const guildId = channel.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const audit = await ActivityLogService.fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, (channel as any).id);
      await ActivityLogService.sendServerLog(channel.guild, tenantId, 'channel_create', { channel, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY CHANNEL CREATE ERROR]', err);
    }
  }
};
