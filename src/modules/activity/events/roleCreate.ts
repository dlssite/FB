import { Role, AuditLogEvent } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'roleCreate',
  async execute(role: Role) {
    if (!role.guild) return;

    try {
      const guildId = role.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      const audit = await ActivityLogService.fetchAuditExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
      await ActivityLogService.sendServerLog(role.guild, tenantId, 'role_create', { role, executor: audit });
    } catch (err) {
      console.error('[ACTIVITY ROLE CREATE ERROR]', err);
    }
  }
};
