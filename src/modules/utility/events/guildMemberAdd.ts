import { Events, GuildMember } from 'discord.js';
import { HeaderRoleService } from '../services/HeaderRoleService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember) {
    const tenantId = await RoutingService.resolveTenantId(member.guild.id, 'utility');
    await HeaderRoleService.syncHeaderRoles(member, tenantId, member.guild.id);
  },
};
