import { Role, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'roleDelete',
  async execute(role: Role) {
    if (!role.guild) return;

    try {
      const guildId = role.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const audit = await ActivityLogService.fetchAuditExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
      await ActivityLogService.sendServerLog(role.guild, tenantId, 'role_delete', { roleId: role.id, role, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY ROLE DELETE ERROR]', err);
    }
  }
};
