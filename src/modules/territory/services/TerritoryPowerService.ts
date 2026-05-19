import { GuildMember, CategoryChannel, PermissionFlagsBits, EmbedBuilder, TextChannel } from 'discord.js';
import { TerritoryRepository } from '../database/TerritoryRepository';
import { TerritoryPowerRepository } from '../database/TerritoryPowerRepository';
import { ContainerService } from '../../../utils/container';
import { EmbedService } from '../../../utils/embed';

export class TerritoryPowerService {
  /**
   * Finds which territories a member has Patron authority over.
   */
  static async resolveGovernedTerritories(tenantId: string, guildId: string, member: GuildMember) {
    const allNations = await TerritoryRepository.listByGuild(tenantId, guildId);
    
    // Admins and owners govern all
    if (member.id === member.guild.ownerId || member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return allNations;
    }

    // Otherwise, check for patronRoleId
    return allNations.filter(n => n.patronRoleId && member.roles.cache.has(n.patronRoleId));
  }

  /**
   * Enforces hierarchy. Patrons cannot act on other Patrons or Admins.
   */
  static async canGovernTarget(actor: GuildMember, target: GuildMember, territory: any): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Target is Owner
    if (target.id === actor.guild.ownerId) {
      return { allowed: false, reason: 'You cannot target the server owner.' };
    }

    // 2. Target is Admin
    if (target.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return { allowed: false, reason: 'You cannot target a server administrator.' };
    }

    // 3. Target is a Patron of this specific territory
    if (territory.patronRoleId && target.roles.cache.has(territory.patronRoleId)) {
      return { allowed: false, reason: 'You cannot target another Patron of this territory.' };
    }

    // 4. Role Hierarchy check (just in case)
    if (target.roles.highest.position >= actor.roles.highest.position && actor.id !== actor.guild.ownerId) {
      return { allowed: false, reason: 'You cannot target someone with a higher or equal role hierarchy.' };
    }

    return { allowed: true };
  }

  /**
   * Logs an action to the DB and the territory's log channel.
   */
  static async logAndNotify(tenantId: string, actor: GuildMember, target: GuildMember, territory: any, action: string, reason: string, interaction: any) {
    // 1. Audit Log (Database)
    await TerritoryPowerRepository.logAction(tenantId, actor.guild.id, {
      nationId: territory.id,
      nationName: territory.name,
      patronId: actor.id,
      patronTag: actor.user.tag,
      targetId: target.id,
      targetTag: target.user.tag,
      action,
      reason
    });

    // 2. Official Audit Log (Log Channel)
    if (territory.logChannelId) {
      const logChannel = actor.guild.channels.cache.get(territory.logChannelId) as TextChannel;
      if (logChannel?.isTextBased()) {
        const logEmbed = EmbedService.base(
          `**Territory:** ${territory.name}\n` +
          `**Actor:** ${actor.user.tag} (${actor.id})\n` +
          `**Target:** ${target.user.tag} (${target.id})\n` +
          `**Reason:** ${reason}`,
          `🛡️ Territory Action: ${action}`
        ).setColor(action === 'BANISH' ? '#EA5455' : '#7367F0');

        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    // 3. Arrival Channel notification (Public Flavor)
    if (territory.arrivalChannelId) {
      const arrivalChannel = actor.guild.channels.cache.get(territory.arrivalChannelId) as TextChannel;
      if (arrivalChannel?.isTextBased()) {
        let flavorText = '';
        let flavorEmoji = '📢';

        switch (action) {
          case 'BANISH':
            flavorText = `⛔ **${target.user.username}** has been cast out from **${territory.name}** and is no longer welcome here.`;
            flavorEmoji = '⛔';
            break;
          case 'EXILE':
            flavorText = `🚪 **${target.user.username}** has departed from **${territory.name}** (Exiled).`;
            flavorEmoji = '🚪';
            break;
          case 'RECALL':
            flavorText = `🔔 **${target.user.username}** has been granted re-entry to **${territory.name}**. Welcome back!`;
            flavorEmoji = '🔔';
            break;
          case 'PARDON':
            flavorText = `✅ The travel ban on **${target.user.username}** has been lifted in **${territory.name}**.`;
            flavorEmoji = '✅';
            break;
          case 'SILENCE':
            flavorText = `🔇 **${target.user.username}** has been silenced in **${territory.name}**.`;
            flavorEmoji = '🔇';
            break;
          case 'UNSILENCE':
            flavorText = `🔊 **${target.user.username}** is no longer silenced in **${territory.name}**.`;
            flavorEmoji = '🔊';
            break;
        }

        if (flavorText) {
          const publicEmbed = EmbedService.base(`${flavorEmoji} ${flavorText}`)
            .setColor(action === 'BANISH' ? '#EA5455' : '#28C76F');

          await arrivalChannel.send({ embeds: [publicEmbed] });
        }
      }
    }
  }

  /**
   * Execute Banishment: Remove Access Role + Add Ban Role
   */
  static async executeBanish(target: GuildMember, territory: any, reason: string) {
    if (territory.roleId && target.roles.cache.has(territory.roleId)) {
      await target.roles.remove(territory.roleId, `Territory Banishment: ${reason}`);
    }
    if (territory.banRoleId) {
      await target.roles.add(territory.banRoleId, `Territory Banishment: ${reason}`);
    }
  }

  /**
   * Execute Exile: Remove Access Role only
   */
  static async executeExile(target: GuildMember, territory: any, reason: string) {
    if (territory.roleId && target.roles.cache.has(territory.roleId)) {
      await target.roles.remove(territory.roleId, `Territory Exile: ${reason}`);
    }
  }

  /**
   * Execute Silence: Apply Category-level override
   */
  static async executeSilence(target: GuildMember, territory: any, reason: string) {
    const category = target.guild.channels.cache.get(territory.categoryId) as CategoryChannel;
    if (category) {
      await category.permissionOverwrites.edit(target.id, {
        SendMessages: false
      }, { reason: `Territory Silence: ${reason}` });
    }
  }

  /**
   * Execute Unsilence: Remove Category-level override
   */
  static async executeUnsilence(target: GuildMember, territory: any) {
    const category = target.guild.channels.cache.get(territory.categoryId) as CategoryChannel;
    if (category) {
      await category.permissionOverwrites.delete(target.id, 'Territory Unsilence');
    }
  }
}
