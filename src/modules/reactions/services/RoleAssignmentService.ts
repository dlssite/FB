import { GuildMember } from 'discord.js';
import { ReactionRepository } from '../database/ReactionRepository';
import { Logger } from '../../../utils/logger';

export class RoleAssignmentService {
  /**
   * Safely assign roles with permission/hierarchy validation
   */
  static async safeAssignRoles(
    member: GuildMember,
    roleIds: string[],
    callerRolePosition?: number
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const roleId of roleIds) {
      try {
        const role = await member.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          Logger.warn(`Role not found for assignment: ${roleId}`);
          failed.push(roleId);
          continue;
        }

        // Check role hierarchy against caller (if provided) or bot's highest role
        const maxPosition = callerRolePosition ?? (member.guild.members.me?.roles.highest.position ?? 0);
        if (role.position >= maxPosition) {
          Logger.warn(`Cannot assign role due to hierarchy: ${roleId} (pos ${role.position})`);
          failed.push(roleId);
          continue;
        }

        // Check if bot has permission
        if (!member.guild.members.me?.permissions.has('ManageRoles')) {
          Logger.warn(`Bot missing ManageRoles permission in guild: ${member.guild.id}`);
          failed.push(roleId);
          continue;
        }

        // Check if member already has the role
        if (member.roles.cache.has(roleId)) {
          success.push(roleId);
          continue;
        }

        await member.roles.add(roleId);
        success.push(roleId);
      } catch (err) {
        Logger.error('Failed to assign role', { roleId, error: err });
        failed.push(roleId);
      }
    }

    return { success, failed };
  }

  /**
   * Safely remove roles
   */
  static async safeRemoveRoles(
    member: GuildMember,
    roleIds: string[]
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const roleId of roleIds) {
      try {
        if (!member.roles.cache.has(roleId)) {
          success.push(roleId);
          continue;
        }

        await member.roles.remove(roleId);
        success.push(roleId);
      } catch (err) {
        Logger.error('Failed to remove role', { roleId, error: err });
        failed.push(roleId);
      }
    }

    return { success, failed };
  }

  /**
   * Check if member can receive roles
   */
  static canMemberReceiveRoles(member: GuildMember): boolean {
    if (member.user.bot) return false;
    if (member.roles.highest.position >= (member.guild.members.me?.roles.highest.position || 0)) {
      return false;
    }
    return true;
  }

  /**
   * Get conflicting roles (from mutual exclusivity)
   */
  static async getConflictingRoles(
    member: GuildMember,
    panelId: number,
    groupId: string,
    tenantId: string
  ): Promise<string[]> {
    try {
      const groupRoles = await ReactionRepository.getRolesInGroup(panelId, groupId);
      const userGroupRoles = await ReactionRepository.getUserRolesInGroup(
        member.guild.id,
        tenantId,
        member.id,
        groupId,
        panelId
      );

      return userGroupRoles.map(r => r.roleId);
    } catch (err) {
      Logger.error('RoleAssignmentService: getConflictingRoles', err);
      return [];
    }
  }

  /**
   * Validate role IDs exist and bot can manage them
   */
  static async validateRoles(
    guild: any,
    roleIds: string[]
  ): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const roleId of roleIds) {
      try {
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          invalid.push(roleId);
          continue;
        }

        const botRole = guild.members.me?.roles.highest;
        if (botRole && role.position >= botRole.position) {
          invalid.push(roleId);
          continue;
        }

        valid.push(roleId);
      } catch (err) {
        invalid.push(roleId);
      }
    }

    return { valid, invalid };
  }
}
