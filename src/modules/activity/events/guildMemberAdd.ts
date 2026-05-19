import { GuildMember } from 'discord.js';
import { ActivityService } from '../services/ActivityService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildMemberAdd',
  async execute(member: GuildMember) {
    if (member.user.bot) return;

    try {
      const guildId = member.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      await ActivityService.logServerGrowth(tenantId, guildId, 'join');

    } catch (err) {
      console.error('[ACTIVITY JOIN TELEMETRY ERROR]', err);
    }
  }
};
