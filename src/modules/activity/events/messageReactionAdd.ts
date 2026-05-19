import { MessageReaction, User } from 'discord.js';
import { ActivityService } from '../services/ActivityService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'messageReactionAdd',
  async execute(reaction: MessageReaction, user: User) {
    if (user.bot || !reaction.message.guild) return;

    try {
      const guildId = reaction.message.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      await ActivityService.logReactionActivity(tenantId, guildId, user.id);

    } catch (err) {
      console.error('[ACTIVITY REACTION TELEMETRY ERROR]', err);
    }
  }
};
