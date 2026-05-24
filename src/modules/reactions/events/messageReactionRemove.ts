import { MessageReaction, User } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { RoutingService } from '../../../services/RoutingService';
import { ReactionRepository } from '../database/ReactionRepository';
import { RoleAssignmentService } from '../services/RoleAssignmentService';

export default {
  name: 'messageReactionRemove',
  once: false,
  async execute(reaction: MessageReaction, user: User) {
    if (user.bot) return;

    try {
      const { message } = reaction;
      if (!message.guild || !message.guild.members) return;

      const guildId = message.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'reactions');

      // Get emoji link for this reaction
      const link = await ReactionRepository.getEmojiLink(
        guildId,
        tenantId,
        message.id,
        reaction.emoji.toString()
      );

      if (!link) return;

      // Parse roleIds if it's a string (from JSON field)
      const roleIds = typeof link.roleIds === 'string' ? JSON.parse(link.roleIds) : (Array.isArray(link.roleIds) ? link.roleIds : []);
      
      if (!roleIds || roleIds.length === 0) return;

      // Fetch member and remove roles
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      await RoleAssignmentService.safeRemoveRoles(member, roleIds);

      // Remove assignment record
      for (const roleId of roleIds) {
        await ReactionRepository.removeRole(guildId, tenantId, user.id, roleId);
      }
    } catch (err: any) {
      Logger.error('MessageReactionRemove Error', err);
    }
  }
};
