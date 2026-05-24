import { Channel, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'channelUpdate',
  async execute(oldChannel: Channel, newChannel: Channel) {
    if (!('guild' in newChannel) || !newChannel.guild) return;

    try {
      const guildId = newChannel.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const changes: string[] = [];
      if ((oldChannel as any).name !== (newChannel as any).name) changes.push(`Name: ${(oldChannel as any).name} → ${(newChannel as any).name}`);

      const audit = await ActivityLogService.fetchAuditExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, (newChannel as any).id);
      await ActivityLogService.sendServerLog(newChannel.guild, tenantId, 'channel_update', { channel: newChannel, changes, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY CHANNEL UPDATE ERROR]', err);
    }
  }
};
