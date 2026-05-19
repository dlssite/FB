import { Events, GuildMember } from 'discord.js';
import { WelcomeService } from '../services/WelcomeService';
import { AddonService } from '../../../services/AddonService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember) {
    const tenantId = await RoutingService.resolveTenantId(member.guild.id, 'welcomer');
    
    // 1. Gatekeeper Check: Is Welcomer enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, member.guild.id, 'welcomer');
    if (!isEnabled) return;

    await WelcomeService.handleJoin(member, tenantId);
  },
};
