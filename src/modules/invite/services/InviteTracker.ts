import { Guild, Collection, Invite } from 'discord.js';
import { RedisService } from '../../../services/RedisService';
import { Logger } from '../../../utils/logger';

export class InviteTracker {
  // Local fallback cache rebuilt natively from Discord API on boot
  private static localCache = new Map<string, Collection<string, Invite>>();

  /**
   * Initializes the cache for a specific guild. Called on ready and guildCreate.
   */
  static async syncGuild(guild: Guild) {
    if (!guild.members.me?.permissions.has('ManageGuild')) return;

    try {
      const invites = await guild.invites.fetch();
      this.localCache.set(guild.id, invites);
      
      // Persist minimal state to Redis
      const minimalInvites = invites.map(i => ({
        code: i.code,
        uses: i.uses || 0,
        inviterId: i.inviter?.id || null
      }));
      
      await RedisService.set(`invites:${guild.id}`, JSON.stringify(minimalInvites), 86400); // 24h
      Logger.info(`Synced ${invites.size} invites for guild ${guild.id}`, 'InviteTracker' as any);

      // Cache vanity uses if applicable
      if (guild.features.includes('VANITY_URL') && guild.vanityURLCode) {
        await RedisService.set(`vanity:${guild.id}`, (guild.vanityURLUses || 0).toString(), 86400);
      }
    } catch (e) {
      Logger.error(`Failed to sync invites for guild ${guild.id}`, e);
    }
  }

  /**
   * Updates cache when an invite is created.
   */
  static async addInvite(invite: Invite) {
    if (!invite.guild) return;
    const guildInvites = this.localCache.get(invite.guild.id);
    if (guildInvites) {
      guildInvites.set(invite.code, invite);
    }
    
    // Quick redis update
    const cachedStr = await RedisService.get(`invites:${invite.guild.id}`);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      parsed.push({ code: invite.code, uses: invite.uses || 0, inviterId: invite.inviter?.id || null });
      await RedisService.set(`invites:${invite.guild.id}`, JSON.stringify(parsed), 86400);
    }
  }

  /**
   * Updates cache when an invite is deleted.
   */
  static async deleteInvite(invite: Invite) {
    if (!invite.guild) return;
    const guildInvites = this.localCache.get(invite.guild.id);
    if (guildInvites) {
      guildInvites.delete(invite.code);
    }
    
    // Quick redis update
    const cachedStr = await RedisService.get(`invites:${invite.guild.id}`);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr).filter((i: any) => i.code !== invite.code);
      await RedisService.set(`invites:${invite.guild.id}`, JSON.stringify(parsed), 86400);
    }
  }

  /**
   * Compares the current guild invites to the cached ones to find which invite was used.
   */
  static async resolveUsedInvite(guild: Guild) {
    if (!guild.members.me?.permissions.has('ManageGuild')) return null;

    try {
      // 1. Wait briefly for Discord API to update uses count
      await new Promise(resolve => setTimeout(resolve, 800));

      const currentInvites = await guild.invites.fetch();
      
      let cachedStr = await RedisService.get(`invites:${guild.id}`);
      let cachedArray: any[] = [];
      
      if (cachedStr) {
        cachedArray = JSON.parse(cachedStr);
      } else {
        const local = this.localCache.get(guild.id);
        if (local) cachedArray = local.map(i => ({ code: i.code, uses: i.uses || 0, inviterId: i.inviter?.id || null }));
      }

      // 2. Find the invite where uses went up
      const usedInvite = currentInvites.find(inv => {
        const cached = cachedArray.find(c => c.code === inv.code);
        if (!cached) return false;
        return (inv.uses || 0) > (cached.uses || 0);
      });

      // 3. Detect Vanity URL if enabled and no regular invite was used
      if (!usedInvite && guild.features.includes('VANITY_URL') && guild.vanityURLCode) {
        const vanityCode = guild.vanityURLCode;
        const vanityUses = guild.vanityURLUses || 0;
        
        const cachedVanity = await RedisService.get(`vanity:${guild.id}`);
        const cachedVanityUses = cachedVanity ? parseInt(cachedVanity, 10) : 0;

        if (vanityUses > cachedVanityUses) {
          await RedisService.set(`vanity:${guild.id}`, vanityUses.toString(), 86400);
          return {
            code: vanityCode,
            inviterId: 'VANITY',
            uses: vanityUses
          };
        }
      }

      // Update cache for next time
      await this.syncGuild(guild);

      if (usedInvite) {
        return {
          code: usedInvite.code,
          inviterId: usedInvite.inviter?.id || null,
          uses: usedInvite.uses || 0
        };
      }

      return null;
    } catch (e) {
      Logger.error(`Error resolving used invite for guild ${guild.id}`, e);
      return null;
    }
  }
}
