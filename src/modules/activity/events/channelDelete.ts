import { Channel, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'channelDelete',
  async execute(channel: Channel) {
    if (!('guild' in channel) || !channel.guild) return;

    try {
      const guildId = channel.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const audit = await ActivityLogService.fetchAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, (channel as any).id);
      await ActivityLogService.sendServerLog(channel.guild, tenantId, 'channel_delete', { channel, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY CHANNEL DELETE ERROR]', err);
    }
  }
};
