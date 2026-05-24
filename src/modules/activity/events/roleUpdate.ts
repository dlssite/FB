import { Role, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'roleUpdate',
  async execute(oldRole: Role, newRole: Role) {
    if (!newRole.guild) return;

    try {
      const guildId = newRole.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const changes: string[] = [];
      if (oldRole.name !== newRole.name) changes.push(`Name: ${oldRole.name} → ${newRole.name}`);
      if (oldRole.color !== newRole.color) changes.push(`Color changed`);

      const audit = await ActivityLogService.fetchAuditExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
      await ActivityLogService.sendServerLog(newRole.guild, tenantId, 'role_update', { role: newRole, changes, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY ROLE UPDATE ERROR]', err);
    }
  }
};
