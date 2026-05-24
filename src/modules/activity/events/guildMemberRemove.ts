import { GuildMember } from 'discord.js';
import { ActivityService } from '../services/ActivityService';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildMemberRemove',
  async execute(member: GuildMember) {
    if (member.user.bot) return;

    try {
      const guildId = member.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      await ActivityService.logServerGrowth(tenantId, guildId, 'leave');
      await ActivityLogService.sendServerLog(member.guild, tenantId, 'member_leave', { member });

    } catch (err) {
      console.error('[ACTIVITY LEAVE TELEMETRY ERROR]', err);
    }
  }
};
