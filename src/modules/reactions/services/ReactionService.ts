import { GuildMember, Role, PermissionFlagsBits } from 'discord.js';
import { ReactionRepository } from '../database/ReactionRepository';
import { Logger } from '../../../utils/logger';

export class ReactionService {
  /**
   * Assign roles to a user from a reaction selection
   */
  static async assignReactionRoles(
    member: GuildMember,
    panelId: number,
    itemId: number,
    tenantId: string
  ): Promise<{ assigned: string[]; removed: string[] }> {
    try {
      const panel = await ReactionRepository.getPanelById(panelId);
      if (!panel) throw new Error('Panel not found');

      const item = await ReactionRepository.getItem(itemId);
      if (!item) throw new Error('Reaction item not found');

      const roleIds: string[] = JSON.parse(item.roleIds as any);
      const assigned: string[] = [];
      const removed: string[] = [];

      // Handle mutual exclusivity
      if (item.mutuallyExclusive && item.groupId) {
        const groupRoles = await ReactionRepository.getRolesInGroup(panelId, item.groupId);
        const userGroupRoles = await ReactionRepository.getUserRolesInGroup(
          member.guild.id,
          tenantId,
          member.id,
          item.groupId,
          panelId
        );

        // Remove all roles from the same group first
        for (const groupRole of userGroupRoles) {
          try {
            await member.roles.remove(groupRole.roleId);
            await ReactionRepository.removeRole(member.guild.id, tenantId, member.id, groupRole.roleId);
            removed.push(groupRole.roleId);
          } catch (err) {
            Logger.warn(`Failed to remove group role: ${groupRole.roleId}`);
          }
        }
      }

      // Assign new roles
      for (const roleId of roleIds) {
        const hasRole = await ReactionRepository.hasRole(member.guild.id, tenantId, member.id, roleId);
        if (!hasRole) {
          try {
            const role = await member.guild.roles.fetch(roleId).catch(() => null);
            if (!role) {
              Logger.warn(`Role not found: ${roleId}`);
              continue;
            }

            await member.roles.add(roleId);
            await ReactionRepository.assignRole({
              guildId: member.guild.id,
              tenantId,
              userId: member.id,
              roleId,
              panelId,
              reactionItemId: itemId
            });
            assigned.push(roleId);
          } catch (err) {
            Logger.error('Failed to assign reaction role', { roleId, error: err });
          }
        }
      }

      return { assigned, removed };
    } catch (err) {
      Logger.error('ReactionService: assignReactionRoles', err);
      throw err;
    }
  }

  /**
   * Remove a reaction role from user
   */
  static async removeReactionRole(
    member: GuildMember,
    roleId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      const hasRole = await ReactionRepository.hasRole(member.guild.id, tenantId, member.id, roleId);
      if (!hasRole) return false;

      try {
        await member.roles.remove(roleId);
      } catch (err) {
        Logger.warn(`Failed to remove role from member: ${roleId}`);
      }

      await ReactionRepository.removeRole(member.guild.id, tenantId, member.id, roleId);
      return true;
    } catch (err) {
      Logger.error('ReactionService: removeReactionRole', err);
      throw err;
    }
  }

  /**
   * Get user's current reaction roles
   */
  static async getUserReactionRoles(member: GuildMember, tenantId: string): Promise<Role[]> {
    try {
      const userRoles = await ReactionRepository.getUserRoles(member.guild.id, tenantId, member.id);
      const roles: Role[] = [];

      for (const record of userRoles) {
        const role = await member.guild.roles.fetch(record.roleId).catch(() => null);
        if (role) roles.push(role);
      }

      return roles;
    } catch (err) {
      Logger.error('ReactionService: getUserReactionRoles', err);
      return [];
    }
  }

  /**
   * Validate panel is functional
   */
  static async validatePanel(guildId: string, panelId: number): Promise<boolean> {
    try {
      const panel = await ReactionRepository.getPanelById(panelId);
      if (!panel) return false;

      if (panel.guildId !== guildId) return false;

      return true;
    } catch (err) {
      Logger.error('ReactionService: validatePanel', err);
      return false;
    }
  }

  /**
   * Check permission to create panel
   */
  static checkPanelCreatePermission(member: GuildMember): boolean {
    return member.permissions.has(PermissionFlagsBits.ManageRoles);
  }
}
