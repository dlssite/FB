import { GuildMember, User } from 'discord.js';
import { ContainerService } from '../../../utils/container';
import { ModerationRepository } from '../database/ModerationRepository';
import { LogService } from './LogService';
import { formatDuration } from '../../../utils/duration';

export class ModerationService {
  /**
   * Universal punishment executor.
   */
  static async executeAction(config: {
    guildId: string;
    tenantId: string;
    guild: any;
    moderator: User;
    target: GuildMember | User;
    action: 'BAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'UNBAN' | 'UNTIMEOUT' | 'UNWARN' | 'CLEAR_WARNS' | 'LOCK' | 'UNLOCK' | 'CLEAR' | 'ROLE' | 'SLOWMODE';
    reason?: string;
    duration?: number; // In Milliseconds
    caseId?: number; // For UNWARN
    role?: any; // For ROLE
    seconds?: number; // For SLOWMODE
  }) {
    const { guildId, tenantId, guild, moderator, target, action, reason = 'No reason provided.', duration, caseId, role, seconds } = config;
    const targetUser = target instanceof User ? target : (target as any)?.user || target;

    const readableDuration = duration ? formatDuration(duration) : '';
    let fullReason = duration ? `${reason} (Duration: ${readableDuration})` : reason;
    
    if (action === 'SLOWMODE' && seconds !== undefined) {
      fullReason = `${reason} (Seconds: ${seconds})`;
    }

    // 1. Log to DB (PRIORITY)
    try {
      console.log(`[ModLog:WRITE] ${action} for ${targetUser?.id || 'N/A'} | Tenant: ${tenantId} | Guild: ${guildId}`);
      await ModerationRepository.logAction({
        guildId,
        tenantId,
        moderatorId: moderator.id,
        moderatorTag: moderator.tag,
        targetId: targetUser?.id || '0',
        targetTag: targetUser?.tag || 'N/A',
        action,
        reason: fullReason,
      });
    } catch (err) {
      console.error(`[CRITICAL] Failed to write mod log to DB:`, err);
    }

    // 2. DM the user (Best effort) - Only for certain punishments
    if (targetUser && ['BAN', 'KICK', 'TIMEOUT', 'WARN'].includes(action)) {
      const dmContainer = ContainerService.create({
        title: `🔨 You were punished in ${guild.name}`,
        description: `**Action:** ${action}\n**Reason:** ${reason}`,
        color: '#EA5455',
        footer: true,
      });
      
      await targetUser.send(dmContainer).catch(() => {});
    }

    // 3. Log to Live Feed (Discord Channel)
    const actionColors: Record<string, string> = {
      'BAN': '#EA5455',
      'KICK': '#F8D030',
      'TIMEOUT': '#7367F0',
      'WARN': '#FF9F43',
      'UNBAN': '#28C76F',
      'UNTIMEOUT': '#28C76F',
      'UNWARN': '#28C76F',
      'CLEAR_WARNS': '#28C76F',
      'LOCK': '#EA5455',
      'UNLOCK': '#28C76F',
      'CLEAR': '#7367F0',
      'ROLE': '#7367F0',
      'SLOWMODE': '#7367F0'
    };
    try {
      await LogService.logCase(guild, tenantId, {
        action,
        moderator: moderator.tag,
        target: targetUser ? `${targetUser.tag} (${targetUser.id})` : 'N/A',
        reason: fullReason,
        color: actionColors[action] || '#82868B'
      });
    } catch (err) {
      console.error(`[Warning] Failed to post mod log to channel:`, err);
    }

    // 4. Execute Discord Action
    try {
      if (action === 'BAN' && !(target instanceof GuildMember) && targetUser?.id) {
        await guild.members.ban(targetUser.id, { reason });
      } else if (action === 'UNBAN' && targetUser?.id) {
        await guild.members.unban(targetUser.id, reason);
      } else if (action === 'UNWARN' && caseId) {
        await ModerationRepository.deleteWarning(caseId, tenantId, guildId);
      } else if (action === 'CLEAR_WARNS' && targetUser?.id) {
        await ModerationRepository.clearAllWarnings(tenantId, guildId, targetUser.id);
      } else if (action === 'SLOWMODE' && seconds !== undefined) {
        const channel = config.target as any; // In SLOWMODE/LOCK, target is the channel
        if (channel && 'setRateLimitPerUser' in channel) {
          await channel.setRateLimitPerUser(seconds, reason);
        }
      } else if (action === 'CLEAR' && duration) { // Using duration as amount for CLEAR
        const channel = config.target as any;
        if (channel && 'bulkDelete' in channel) {
          await channel.bulkDelete(duration, true);
        }
      } else if (action === 'LOCK' || action === 'UNLOCK') {
        const channel = config.target as any;
        if (channel && 'permissionOverwrites' in channel) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: action === 'LOCK' ? false : null,
          });
        }
      } else if (action === 'ROLE' && role && target instanceof GuildMember) {
        if (target.roles.cache.has(role.id)) {
          await target.roles.remove(role, reason);
        } else {
          await target.roles.add(role, reason);
        }
      } else if (target instanceof GuildMember) {
        switch (action) {
          case 'BAN':
            await target.ban({ reason });
            break;
          case 'KICK':
            await target.kick(reason);
            break;
          case 'TIMEOUT':
            if (duration) await target.timeout(duration, reason);
            break;
          case 'UNTIMEOUT':
            await target.timeout(null, reason);
            break;
        }
      }
    } catch (err) {
      console.error(`[ModerationService] Error executing Discord action for ${action}:`, err);
      throw err;
    }

    // 5. Fetch warning count if applicable
    let warningCount = 0;
    if (action === 'WARN' && targetUser?.id) {
      const warnings = await ModerationRepository.getUserWarnings(tenantId, guildId, targetUser.id);
      warningCount = warnings.length;
    }

    return { success: true, warningCount };
  }

  /**
   * Fetches all actions for a specific user.
   */
  static async getActions(tenantId: string, guildId: string, userId: string) {
    return await ModerationRepository.getUserLogs(tenantId, guildId, userId);
  }

  /**
   * Fetches all actions performed BY a specific moderator.
   */
  static async getModeratorActions(tenantId: string, guildId: string, moderatorId: string) {
    return await ModerationRepository.getModeratorLogs(tenantId, guildId, moderatorId);
  }
}
