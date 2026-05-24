import { Guild, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildBanRemove',
  async execute(guild: Guild, user: any) {
    try {
      const guildId = guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const audit = await ActivityLogService.fetchAuditExecutor(guild, AuditLogEvent.MemberBanRemove, user.id);
      await ActivityLogService.sendServerLog(guild, tenantId, 'guild_ban_remove', { userTag: user.tag || user.username || String(user.id), userId: user.id, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY GUILD BAN REMOVE ERROR]', err);
    }
  }
};
