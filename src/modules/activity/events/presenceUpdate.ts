import { Presence } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'presenceUpdate',
  async execute(oldPresence: Presence | null, newPresence: Presence) {
    try {
      const member = newPresence.member;
      if (!member || member.user.bot) return;
      const guild = member.guild;
      const guildId = guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const oldStatus = oldPresence?.status || 'unknown';
      const newStatus = newPresence.status || 'unknown';
      if (oldStatus === newStatus) return;

      await ActivityLogService.sendServerLog(guild, tenantId, 'presence_update', {
        user: member.user,
        oldStatus,
        newStatus
      });
    } catch (err) {
      console.error('[ACTIVITY PRESENCE UPDATE ERROR]', err);
    }
  }
};
