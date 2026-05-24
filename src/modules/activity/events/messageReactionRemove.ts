import { MessageReaction, User } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'messageReactionRemove',
  async execute(reaction: MessageReaction, user: User) {
    if (user.bot || !reaction.message.guild) return;

    try {
      const guildId = reaction.message.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      await ActivityLogService.sendServerLog(reaction.message.guild, tenantId, 'message_reaction_remove', {
        authorTag: reaction.message.author?.tag,
        authorId: reaction.message.author?.id,
        userTag: user.tag,
        userId: user.id,
        channelId: reaction.message.channelId,
        channelName: reaction.message.channel?.isTextBased() && 'name' in reaction.message.channel ? reaction.message.channel.name : undefined,
        emoji: reaction.emoji.name
      });
    } catch (err) {
      console.error('[ACTIVITY REACTION REMOVE ERROR]', err);
    }
  }
};
