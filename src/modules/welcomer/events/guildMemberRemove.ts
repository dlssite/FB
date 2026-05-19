import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { WelcomeService } from '../services/WelcomeService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member: GuildMember | PartialGuildMember) {
    const tenantId = await RoutingService.resolveTenantId(member.guild.id, 'welcomer');
    
    console.log(`[Event] [WELCOMER] ${member.user.tag} left ${member.guild.name} (Tenant: ${tenantId})`);
    
    await WelcomeService.handleLeave(member as GuildMember, tenantId);
  },
};
