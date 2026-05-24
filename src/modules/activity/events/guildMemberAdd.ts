import { GuildMember } from 'discord.js';
import { ActivityService } from '../services/ActivityService';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildMemberAdd',
  async execute(member: GuildMember) {
    if (member.user.bot) return;

    try {
      const guildId = member.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      await ActivityService.logServerGrowth(tenantId, guildId, 'join');
      await ActivityLogService.sendServerLog(member.guild, tenantId, 'member_join', { member });

    } catch (err) {
      console.error('[ACTIVITY JOIN TELEMETRY ERROR]', err);
    }
  }
};
