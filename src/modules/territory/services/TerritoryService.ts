import { GuildChannel, CategoryChannel } from 'discord.js';
import { TerritoryRepository } from '../database/TerritoryRepository';

export class TerritoryService {
  /**
   * Resolves a Discord Channel to its parent Territory if registered.
   */
  static async resolveLocation(tenantId: string, guildId: string, channel: GuildChannel | any) {
    const categoryId = channel.parentId;
    if (!categoryId) return null;

    return await TerritoryRepository.getByCategoryId(tenantId, guildId, categoryId);
  }

  /**
   * Checks if a user has access to a territory based on roles.
   */
  static async canAccess(member: any, territory: any): Promise<{ allowed: boolean; reason?: string }> {
    if (!territory) return { allowed: true };

    // 1. Check for Ban Role
    if (territory.banRoleId && member.roles.cache.has(territory.banRoleId)) {
      return { allowed: false, reason: 'You are banned from this territory.' };
    }

    // 2. Check for Required Role
    if (territory.roleId && !member.roles.cache.has(territory.roleId)) {
      return { allowed: false, reason: `You need the <@&${territory.roleId}> role to access this territory.` };
    }

    return { allowed: true };
  }

  /**
   * Fetches all nation settings for a specific category.
   */
  static async getNationSettings(tenantId: string, guildId: string, categoryId: string) {
    return await TerritoryRepository.getByCategoryId(tenantId, guildId, categoryId);
  }

  /**
   * Formats territory info for display.
   */
  static formatTerritoryInfo(territory: any) {
    return {
      name: territory.name,
      resource: territory.resourceName || 'Unknown',
      basePrice: territory.resourceBasePrice || 0,
      roles: {
        access: territory.roleId,
        patron: territory.patronRoleId,
        ban: territory.banRoleId
      },
      channels: {
        log: territory.logChannelId,
        arrival: territory.arrivalChannelId
      },
      image: territory.imageUrl
    };
  }
}
