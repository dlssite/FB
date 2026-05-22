import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { WelcomeService } from '../services/WelcomeService';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member: GuildMember | PartialGuildMember) {
    const tenantId = await RoutingService.resolveTenantId(member.guild.id, 'welcomer');
    
    // Gatekeeper Check: Is Welcomer enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, member.guild.id, 'welcomer');
    if (!isEnabled) return;
    
    console.log(`[Event] [WELCOMER] ${member.user.tag} left ${member.guild.name} (Tenant: ${tenantId})`);
    
    await WelcomeService.handleLeave(member as GuildMember, tenantId);
  },
};
