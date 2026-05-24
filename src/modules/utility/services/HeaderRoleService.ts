import { Client, GuildMember } from 'discord.js';
import { HeaderRoleRepository } from '../database/HeaderRoleRepository';
import { RoutingService } from '../../../services/RoutingService';

interface HeaderRoleGroup {
  headerRoleId: string;
  childRoleIds: string[];
}

export class HeaderRoleService {
  private static headerGroupsCache = new Map<string, HeaderRoleGroup[]>();

  static getGroups(guildId: string): HeaderRoleGroup[] {
    return this.headerGroupsCache.get(guildId) ?? [];
  }

  static async refreshGuild(client: Client, tenantId: string, guildId: string) {
    const headerRoleIds = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
    if (headerRoleIds.length === 0) {
      this.headerGroupsCache.delete(guildId);
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      this.headerGroupsCache.delete(guildId);
      return;
    }

    await guild.roles.fetch().catch(() => null);

    const uniqueHeaderRoleIds = Array.from(new Set(headerRoleIds));
    const headerRoles = uniqueHeaderRoleIds
      .map(id => guild.roles.cache.get(id))
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .sort((a, b) => b.position - a.position);

    if (headerRoles.length === 0) {
      this.headerGroupsCache.delete(guildId);
      return;
    }

    const groups: HeaderRoleGroup[] = headerRoles.map((header, index) => {
      const nextHeader = headerRoles[index + 1];
      const minPosition = nextHeader ? nextHeader.position : -1;

      const childRoleIds = guild.roles.cache
        .filter(role =>
          role.id !== guild.id &&
          role.id !== header.id &&
          !uniqueHeaderRoleIds.includes(role.id) &&
          role.position < header.position &&
          role.position > minPosition,
        )
        .sort((a, b) => b.position - a.position)
        .map(role => role.id);

      return {
        headerRoleId: header.id,
        childRoleIds,
      };
    });

    this.headerGroupsCache.set(guildId, groups);
  }

  static async refreshAll(client: Client) {
    const guilds = Array.from(client.guilds.cache.values());
    for (const guild of guilds) {
      try {
        const tenantId = await RoutingService.resolveTenantId(guild.id, 'utility');
        await this.refreshGuild(client, tenantId, guild.id);
      } catch (error) {
        console.error(`[HeaderRoleService] Failed to refresh guild ${guild.id}:`, error);
      }
    }
  }

  static async syncHeaderRoles(member: GuildMember, tenantId: string, guildId: string) {
    const groups = this.getGroups(guildId);
    if (!groups.length) {
      await this.refreshGuild(member.client, tenantId, guildId);
    }

    const resolvedGroups = this.getGroups(guildId);
    if (!resolvedGroups.length) return;

    const currentRoleIds = new Set(member.roles.cache.keys());

    for (const group of resolvedGroups) {
      const hasChildRole = group.childRoleIds.some(id => currentRoleIds.has(id));
      const hasHeader = currentRoleIds.has(group.headerRoleId);

      if (hasChildRole && !hasHeader) {
        await member.roles.add(group.headerRoleId).catch(() => null);
      } else if (!hasChildRole && hasHeader) {
        await member.roles.remove(group.headerRoleId).catch(() => null);
      }
    }
  }

  static async fixGuildMembers(client: Client, tenantId: string, guildId: string) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return { processed: 0, errors: 0 };
    }

    await this.refreshGuild(client, tenantId, guildId);
    const groups = this.getGroups(guildId);
    if (!groups.length) {
      return { processed: 0, errors: 0 };
    }

    await guild.members.fetch().catch(() => null);
    let processed = 0;
    let errors = 0;

    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      processed += 1;
      try {
        await this.syncHeaderRoles(member, tenantId, guildId);
      } catch (err) {
        errors += 1;
      }
    }

    return { processed, errors };
  }
}
