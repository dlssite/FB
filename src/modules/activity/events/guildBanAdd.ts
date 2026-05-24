import { GuildBan, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildBanAdd',
  async execute(ban: GuildBan) {
    try {
      const guild = ban.guild;
      const guildId = guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const audit = await ActivityLogService.fetchAuditExecutor(guild, AuditLogEvent.MemberBanAdd, ban.user.id);
      await ActivityLogService.sendServerLog(guild, tenantId, 'guild_ban_add', { userTag: ban.user.tag, userId: ban.user.id, reason: ban.reason, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY GUILD BAN ADD ERROR]', err);
    }
  }
};
