import { Guild, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildUpdate',
  async execute(oldGuild: Guild, newGuild: Guild) {
    try {
      const guildId = newGuild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const changes: string[] = [];
      if (oldGuild.name !== newGuild.name) changes.push(`Name: ${oldGuild.name} → ${newGuild.name}`);
      if (oldGuild.icon !== newGuild.icon) changes.push('Icon changed');

      const audit = await ActivityLogService.fetchAuditExecutor(newGuild, AuditLogEvent.GuildUpdate);
      await ActivityLogService.sendServerLog(newGuild, tenantId, 'guild_update', { changes, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY GUILD UPDATE ERROR]', err);
    }
  }
};
