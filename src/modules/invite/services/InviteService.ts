import { Guild, GuildMember, Role } from 'discord.js';
import { InviteRepository } from '../database/InviteRepository';
import { Logger } from '../../../utils/logger';

export class InviteService {
  /**
   * Processes the top inviter role assignment.
   */
  static async evaluateTopInviter(tenantId: string, guild: Guild) {
    try {
      const settings = await InviteRepository.getSettings(tenantId, guild.id);
      if (!settings?.topInviterRoleId) return;

      const topInviterRoleId = settings.topInviterRoleId;
      const role = guild.roles.cache.get(topInviterRoleId);
      if (!role) return;

      const topInviter = await InviteRepository.getTopInviter(tenantId, guild.id);
      if (!topInviter || topInviter.realInvites <= 0) return;

      const currentHolders = role.members;

      // If the true top inviter already holds it and is the only one, return
      if (currentHolders.has(topInviter.userId) && currentHolders.size === 1) return;

      // Remove from anyone who shouldn't have it
      for (const [memberId, member] of currentHolders) {
        if (memberId !== topInviter.userId) {
          await member.roles.remove(role).catch(() => {});
        }
      }

      // Add to the true champion
      const champion = await guild.members.fetch(topInviter.userId).catch(() => null);
      if (champion && !champion.roles.cache.has(role.id)) {
        await champion.roles.add(role).catch(() => {});
        Logger.tenant(tenantId, `[Invite] Granted Top Inviter role to ${champion.user.tag}`);
      }
    } catch (e) {
      Logger.error('Failed to evaluate top inviter', e);
    }
  }

  /**
   * Processes milestone role assignment.
   */
  static async evaluateMilestones(tenantId: string, guild: Guild, userId: string, realInvites: number) {
    try {
      const settings = await InviteRepository.getSettings(tenantId, guild.id);
      if (!settings?.milestoneRoles || !Array.isArray(settings.milestoneRoles)) return;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      const milestones: any[] = settings.milestoneRoles;
      // Sort ascending by threshold
      milestones.sort((a, b) => a.threshold - b.threshold);

      let earnedRoles: string[] = [];
      let nextRoleIndex = -1;

      for (let i = 0; i < milestones.length; i++) {
        if (realInvites >= milestones[i].threshold) {
          earnedRoles.push(milestones[i].roleId);
        } else {
          nextRoleIndex = i;
          break;
        }
      }

      if (earnedRoles.length === 0) return; // Haven't reached any milestones yet

      // If roleStack is true, they keep all earned roles. If false, they only keep the highest earned role.
      if (!settings.roleStack) {
        const highestRoleId = earnedRoles[earnedRoles.length - 1];
        earnedRoles = [highestRoleId];
      }

      const allMilestoneRoleIds = milestones.map(m => m.roleId);

      for (const roleId of allMilestoneRoleIds) {
        const hasRole = member.roles.cache.has(roleId);
        const shouldHaveRole = earnedRoles.includes(roleId);

        if (shouldHaveRole && !hasRole) {
          const role = guild.roles.cache.get(roleId);
          if (role) await member.roles.add(role).catch(() => {});
        } else if (!shouldHaveRole && hasRole) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }
    } catch (e) {
      Logger.error('Failed to evaluate milestone roles', e);
    }
  }

  /**
   * Re-evaluates a user's stats and assigns roles if necessary.
   */
  static async syncUserRoles(tenantId: string, guild: Guild, userId: string) {
    const stats = await InviteRepository.getUserStats(tenantId, guild.id, userId);
    const realInvites = Number(stats.invites || 0) + Number(stats.bonus || 0) - Number(stats.leaves || 0) - Number(stats.fake || 0);

    await this.evaluateMilestones(tenantId, guild, userId, realInvites);
    await this.evaluateTopInviter(tenantId, guild);
  }
}
