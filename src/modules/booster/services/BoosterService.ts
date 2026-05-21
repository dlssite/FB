import { Guild, GuildMember, Role } from 'discord.js';
import { BoosterRepository } from '../database/BoosterRepository';
import { Logger } from '../../../utils/logger';
import { RedisService } from '../../../services/RedisService';
import { GuildService } from '../../../services/GuildService';
import { flamebornConfig } from '../../../config/flameborn.config';

export class BoosterService {
  /**
   * Calculates the current Booster Tier for a user, or if they inherit it from a buddy.
   */
  static async getTierStatus(tenantId: string, guildId: string, userId: string, member?: GuildMember) {
    let activeBoosts = 0;
    
    // Calculate via Discord native if member object is provided
    if (member && member.premiumSince) {
      // In a real bot we might look at roles, but we'll assume premiumSince means 1 boost by default,
      // or we can calculate based on roles if the server uses 'Booster' role counting.
      // Discord API doesn't expose EXACT boost count per user easily without checking roles.
      // For this system, we'll assume: premiumSince = at least 1. We might need a way to track 2+.
      // As a prototype, we'll check if they have the booster role.
      activeBoosts = 1; // Base case: they are a booster
      
      // Look for custom tracking (some bots use roles to mark "2x Booster").
      // For FBT, we'll assume any booster is Tier 2 for testing, or we can check role count if applicable.
      // We will default to 2 boosts for testing Tier 2 functionality if they are boosting.
      activeBoosts = 2; 
    }

    // Is the user a buddy?
    const buddyRole = await BoosterRepository.getRoleByBuddy(tenantId, guildId, userId);
    
    if (buddyRole) {
      return { tier: 1, activeBoosts: 0, isBuddy: true, ownerId: buddyRole.ownerId }; // Buddies get Tier 1 economy perks
    }

    if (activeBoosts >= 2) {
      return { tier: 2, activeBoosts, isBuddy: false };
    } else if (activeBoosts === 1) {
      return { tier: 1, activeBoosts, isBuddy: false };
    }

    return { tier: 0, activeBoosts: 0, isBuddy: false };
  }

  /**
   * Gets the multipliers for a user based on their tier.
   */
  static getMultipliers(tier: number) {
    if (tier >= 1) return { economy: 1.5, leveling: 1.2 };
    return { economy: 1.0, leveling: 1.0 };
  }

  /**
   * Creates or updates a custom role for a Tier 2 booster.
   */
  static async forgeCustomRole(tenantId: string, guild: Guild, ownerId: string, name: string, hexColor: string) {
    const settings = await BoosterRepository.getSettings(tenantId, guild.id);
    let position = 1;

    // Resolve Anchor Role position
    if (settings?.roleAnchorId) {
      const anchorRole = guild.roles.cache.get(settings.roleAnchorId);
      if (anchorRole) {
        position = anchorRole.position - 1; // Create right below the anchor
      }
    }

    // Check if role already exists in DB
    const existingData = await BoosterRepository.getRole(tenantId, guild.id, ownerId);
    let discordRole: Role | null = null;

    if (existingData) {
      discordRole = guild.roles.cache.get(existingData.roleId) || null;
      if (!discordRole) {
        // DB says it exists but Discord deleted it. We will recreate.
      } else {
        // Edit existing
        discordRole = await discordRole.edit({ name, colors: hexColor as any });
        return { success: true, roleId: discordRole.id, action: 'edited' };
      }
    }

    // Create new
    discordRole = await guild.roles.create({
      name,
      colors: hexColor as any,
      position: position > 0 ? position : undefined,
      reason: `Booster custom role creation for ${ownerId}`
    });

    await BoosterRepository.registerRole(tenantId, guild.id, ownerId, discordRole.id);

    // Assign to owner
    const member = await guild.members.fetch(ownerId).catch(() => null);
    if (member) await member.roles.add(discordRole);

    return { success: true, roleId: discordRole.id, action: 'created' };
  }

  /**
   * Evaluates a member to see if their grace period should trigger.
   */
  static async evaluateGracePeriod(tenantId: string, guild: Guild, member: GuildMember) {
    // If they are no longer boosting
    if (!member.premiumSince) {
      const roleData = await BoosterRepository.getRole(tenantId, guild.id, member.id);
      if (roleData) {
        // If not already in grace, start it
        if (!roleData.isGrace) {
          const graceUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
          await BoosterRepository.setGracePeriod(tenantId, guild.id, member.id, true, graceUntil);
          Logger.tenant(tenantId, `[Booster] User ${member.id} unboosted. Grace period started until ${graceUntil.toISOString()}`);
          
          try {
            await member.send(`⚠️ **Your Discord Server Boost for ${guild.name} has ended!**\nYou have a 3-day grace period before your custom role and buddy perks are deleted. Please re-boost to keep them!`);
          } catch (e) {}
        }
      }
    } else {
      // They ARE boosting. Clear grace if it was active.
      const roleData = await BoosterRepository.getRole(tenantId, guild.id, member.id);
      if (roleData && roleData.isGrace) {
        await BoosterRepository.setGracePeriod(tenantId, guild.id, member.id, false, null);
        Logger.tenant(tenantId, `[Booster] User ${member.id} re-boosted. Grace period cleared.`);
        
        try {
          await member.send(`🎉 **Thank you for re-boosting ${guild.name}!**\nYour custom role has been secured and your grace period was cleared.`);
        } catch (e) {}
      }
    }
  }

  /**
   * Cron-like function to purge expired grace period roles.
   */
  static async purgeExpiredRoles(tenantId: string, guild: Guild) {
    const roles = await BoosterRepository.getGuildRoles(tenantId, guild.id);
    const now = new Date();
    let purged = 0;

    for (const r of roles) {
      if (r.isGrace && r.graceUntil && r.graceUntil < now) {
        const discordRole = guild.roles.cache.get(r.roleId);
        if (discordRole) {
          await discordRole.delete('Booster grace period expired.').catch(() => null);
        }
        await BoosterRepository.deleteRole(tenantId, guild.id, r.ownerId);
        purged++;
        Logger.tenant(tenantId, `[Booster] Purged expired custom role for owner ${r.ownerId} in guild ${guild.id}`);
      }
    }
    return purged;
  }

  /**
   * Starts the background worker for booster maintenance.
   */
  static startBoosterWorker(client: any) {
    Logger.info('Booster Maintenance workers started.', 'BoosterService' as any);

    // Check every hour
    setInterval(async () => {
      const lock = await RedisService.acquireLock('lock:booster:purge', 3500);
      if (!lock) return;

      const guilds = await GuildService.getAllGuildSettings();
      for (const settings of guilds) {
        const guild = await client.guilds.fetch(settings.guildId).catch(() => null);
        if (guild) {
          await this.purgeExpiredRoles(settings.tenantId, guild);
        }
      }
    }, 3600000);
  }
}
