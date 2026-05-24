import { GuildMember } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'guildMemberUpdate',
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    if (newMember.user.bot) return;

    try {
      const guildId = newMember.guild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');
      const changes: string[] = [];

      if (oldMember.nickname !== newMember.nickname) {
        changes.push(`Nickname: ${oldMember.nickname || '*none*'} → ${newMember.nickname || '*none*'}`);
      }
      if (oldMember.user.username !== newMember.user.username) {
        changes.push(`Username: ${oldMember.user.username} → ${newMember.user.username}`);
      }
      if (oldMember.user.avatar !== newMember.user.avatar) {
        changes.push('Avatar updated');
      }
      if (oldMember.displayName !== newMember.displayName) {
        changes.push(`Display Name: ${oldMember.displayName} → ${newMember.displayName}`);
      }

      // Detect role changes
      const oldRoles = new Set(oldMember.roles.cache.map(r => r.id));
      const newRoles = new Set(newMember.roles.cache.map(r => r.id));
      const added: any[] = [];
      const removed: any[] = [];

      for (const r of newMember.roles.cache.values()) {
        if (!oldRoles.has(r.id)) added.push({ id: r.id, name: r.name });
      }
      for (const r of oldMember.roles.cache.values()) {
        if (!newRoles.has(r.id)) removed.push({ id: r.id, name: r.name });
      }

      if (changes.length === 0 && added.length === 0 && removed.length === 0) return;

      if (changes.length > 0) {
        await ActivityLogService.sendServerLog(newMember.guild, tenantId, 'member_update', {
          member: newMember,
          changes
        });
      }

      if (added.length > 0 || removed.length > 0) {
        await ActivityLogService.sendServerLog(newMember.guild, tenantId, 'role_change', {
          member: newMember,
          added,
          removed
        });
      }
    } catch (err) {
      console.error('[ACTIVITY MEMBER UPDATE ERROR]', err);
    }
  }
};
