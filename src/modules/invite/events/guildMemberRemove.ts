import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { InviteService } from '../services/InviteService';
import { InviteRepository } from '../database/InviteRepository';
import { RoutingService } from '../../../services/RoutingService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { prisma } from '../../../database/client';
import { Logger } from '../../../utils/logger';

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    if (!flamebornConfig.modules.invite.active || member.user.bot) return;

    try {
      const tenantId = await RoutingService.resolveTenantId(member.guild.id, 'invite');

      // Find who invited them
      const history = await prisma.invite_histories.findFirst({
        where: { tenantId, guildId: member.guild.id, memberId: member.id },
        orderBy: { createdAt: 'desc' } // Get their most recent join
      });

      if (history && history.inviterId && history.inviterId !== 'UNKNOWN') {
        const inviterId = history.inviterId;

        // Standard Practice: Always add a leave if we find an inviter.
        // Since we now always add a join on entry (even re-joins), this 
        // keeps the net balance (Joins - Leaves) accurate to the member's presence.
        await InviteRepository.addLeaves(tenantId, member.guild.id, inviterId, 1);
        await InviteService.syncUserRoles(tenantId, member.guild, inviterId);
        
        Logger.info(`Member ${member.user?.tag || member.id} left. Incremented leave for inviter ${inviterId}.`, 'INVITE' as any);
      }
    } catch (err) {
      Logger.error(`Error in guildMemberRemove (Invite Module) for member ${member.id}`, err);
    }
  }
};
