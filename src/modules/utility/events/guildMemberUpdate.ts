import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { HeaderRoleService } from '../services/HeaderRoleService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    if (!newMember.guild) return;

    const oldRoleIds = new Set(oldMember.roles?.cache.map(role => role.id) || []);
    const newRoleIds = new Set(newMember.roles.cache.map(role => role.id));
    const rolesChanged = oldRoleIds.size !== newRoleIds.size ||
      [...oldRoleIds].some(roleId => !newRoleIds.has(roleId));

    if (!rolesChanged) return;

    const tenantId = await RoutingService.resolveTenantId(newMember.guild.id, 'utility');
    await HeaderRoleService.syncHeaderRoles(newMember, tenantId, newMember.guild.id);
  },
};
