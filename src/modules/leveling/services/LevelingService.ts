import { LevelingRepository } from '../database/LevelingRepository';
import { client } from '../../../core/FlamebornClient';
import { GuildService } from '../../../services/GuildService';
import { ContainerService } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Translator } from '../../../core/Translator';
import { tenantStorage } from '../../../utils/context';
import { RedisService } from '../../../services/RedisService';
import { Message } from 'discord.js';

export class LevelingService {
  /**
   * The Advanced Leveling Curve
   * Based on: XP = 5 * (L^Multiplier) + 50 * L + Base
   */
  static getXpRequired(level: number): number {
    const config = flamebornConfig.leveling;
    if (level <= 0) return config.baseXp;
    return Math.floor(5 * Math.pow(level, config.curveMultiplier) + 50 * level + config.baseXp);
  }

  /**
   * Manually awards XP to a user, handling level ups and role rewards.
   */
  static async addExperience(tenantId: string, guildId: string, userId: string, xpAmount: number, channelId?: string, message?: Message) {
    let userRecord = await LevelingRepository.getUser(tenantId, guildId, userId);
    let currentXp = Number(userRecord?.xp || 0);
    let currentLevel = Number(userRecord?.level || 1);

    currentXp += xpAmount;

    const xpNeeded = this.getXpRequired(currentLevel);
    if (currentXp >= xpNeeded) {
      currentLevel++;
      currentXp = 0;
      await LevelingRepository.updateXp(tenantId, guildId, userId, currentXp, currentLevel);
      if (channelId) {
        await this.onLevelUp(tenantId, guildId, userId, currentLevel, channelId, message);
      } else {
        await this.processRoleRewards(tenantId, guildId, userId, currentLevel);
      }
      return;
    }

    await LevelingRepository.updateXp(tenantId, guildId, userId, currentXp, currentLevel);
  }

  /**
   * Processes a new message for XP gain.
   */
  static async handleMessage(tenantId: string, guildId: string, userId: string, channelId: string, member: any, message: Message) {
    const settings = await LevelingRepository.getSettings(tenantId, guildId) || await LevelingRepository.initSettings(tenantId, guildId);
    
    if (!settings.messageXpEnabled) return;

    const config = flamebornConfig.leveling;

    // 1. Blacklist Checks (Channels & Roles)
    const ignoredChannels = (settings.ignoredChannels as string[]) || [];
    if (ignoredChannels.includes(channelId)) return;

    const ignoredRoles = (settings.ignoredRoles as string[]) || [];
    if (member.roles.cache.some((r: any) => ignoredRoles.includes(r.id))) return;

    // 2. Anti-Spam Check (Neural Cooldown)
    const cooldownKey = `xp_cooldown:${tenantId}:${guildId}:${userId}`;
    const lastGainStr = await RedisService.get(cooldownKey);
    const lastGain = lastGainStr ? Number(lastGainStr) : 0;
    const now = Date.now();

    const cooldownTime = settings.messageXpCooldown || config.defaultCooldown;
    if (now - lastGain < cooldownTime * 1000) return;

    // 3. Calculate XP Pulse with Multipliers
    const min = settings.messageXpMin || config.defaultXpMin;
    const max = settings.messageXpMax || config.defaultXpMax;
    let xpGain = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Apply Hotspot Multipliers
    const multipliers = (settings.xpMultipliers as Record<string, number>) || {};
    if (multipliers[channelId]) {
      xpGain = Math.floor(xpGain * multipliers[channelId]);
    }

    // Apply Booster Multipliers
    try {
      const { BoosterService } = await import('../../booster/services/BoosterService');
      const status = await BoosterService.getTierStatus(tenantId, guildId, userId, member);
      const boosterMults = BoosterService.getMultipliers(status.tier);
      xpGain = Math.floor(xpGain * boosterMults.leveling);
    } catch (err) {
      // Ignore if booster module is disabled or missing
    }

    // 4. Update Persistence
    let userRecord = await LevelingRepository.getUser(tenantId, guildId, userId);
    let currentXp = Number(userRecord?.xp || 0);
    let currentLevel = Number(userRecord?.level || 1);

    currentXp += xpGain;
    await RedisService.set(cooldownKey, now.toString(), cooldownTime);

    // 4. Level Up Detection
    const xpNeeded = this.getXpRequired(currentLevel);
    if (currentXp >= xpNeeded) {
      currentLevel++;
      currentXp = 0; // Reset XP for the new level (Standard pattern)
      await LevelingRepository.updateXp(tenantId, guildId, userId, currentXp, currentLevel);
      await this.onLevelUp(tenantId, guildId, userId, currentLevel, channelId, message);
      return;
    }

    await LevelingRepository.updateXp(tenantId, guildId, userId, currentXp, currentLevel);
  }

  /**
   * Triggers when a user ascends to a new level.
   */
  private static formatAnnouncement(template: string, user: any, newLevel: number, guild: any) {
    return template
      .replace(/\{user\.mention\}/gi, `<@${user.id}>`)
      .replace(/\{user\.username\}/gi, user.username)
      .replace(/\{user\.tag\}/gi, user.tag)
      .replace(/\{user\.level\}/gi, `${newLevel}`)
      .replace(/\{guild\.name\}/gi, guild.name)
      .replace(/\{guild\.id\}/gi, guild.id);
  }

  private static async onLevelUp(tenantId: string, guildId: string, userId: string, newLevel: number, channelId: string, message?: Message) {
    const ctx = tenantStorage.getStore();
    const lang = ctx?.lang || 'en';
    const userRecord = await LevelingRepository.getUser(tenantId, guildId, userId);
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const settings = await LevelingRepository.getSettings(tenantId, guildId) || await LevelingRepository.initSettings(tenantId, guildId);
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return;

    const announcedChannelId = settings.levelingChannelId || channelId;
    let announcementChannel = channelId === announcedChannelId ? await guild.channels.fetch(channelId).catch(() => null) : await guild.channels.fetch(announcedChannelId).catch(() => null);
    const originatingChannel = await guild.channels.fetch(channelId).catch(() => null);
    const announceChannel = announcementChannel?.isTextBased() ? announcementChannel : originatingChannel?.isTextBased() ? originatingChannel : null;
    if (!announceChannel) return;

    // 1. Process Role Rewards
    await this.processRoleRewards(tenantId, guildId, userId, newLevel);

    // 2. Announcement
    const template = settings.levelingMessage || 'GG {user.mention}, you reached level **{user.level}**!';
    const content = this.formatAnnouncement(template, user, newLevel, guild);

    if (settings.levelingImageEnabled) {
      const xp = Number(userRecord?.xp || 0);
      const xpNeeded = this.getXpRequired(newLevel);
      const rank = await LevelingRepository.getUserRank(tenantId, guildId, userId);
      const prestige = Number(userRecord?.prestige || 0);
      const { LevelingCanvasService } = await import('./LevelingCanvasService');
      const buffer = await LevelingCanvasService.generateRankCard({
        username: user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 512 }),
        level: newLevel,
        xp,
        xpNeeded,
        rank,
        prestige,
        lang
      });

      await announceChannel.send({ content, files: [{ attachment: buffer, name: 'level-up.png' }] }).catch(() => {});
    } else {
      await announceChannel.send({ content }).catch(() => {});
    }

    // 3. Reaction on the original message if configured
    if (message && settings.levelingReaction) {
      await message.react(settings.levelingReaction).catch(() => {});
    }
  }

  /**
   * Handles non-stacking role rewards.
   */
  private static async processRoleRewards(tenantId: string, guildId: string, userId: string, newLevel: number) {
    const settings = await LevelingRepository.getSettings(tenantId, guildId);
    if (!settings || !settings.roleRewards) return;

    const rewards = settings.roleRewards as any[]; // Expected: { level: number, roleId: string }[]
    if (!Array.isArray(rewards)) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const member = await guild?.members.fetch(userId).catch(() => null);
    if (!guild || !member) return;

    // Find the role for the new level
    const targetReward = rewards.find(r => r.level === newLevel);
    if (!targetReward) return;

    // If non-stacking, remove previous level roles
    if (!settings.roleRewardStack) {
      const levelRoleIds = rewards.map(r => r.roleId);
      const rolesToRemove = member.roles.cache.filter(role => levelRoleIds.includes(role.id) && role.id !== targetReward.roleId);
      
      for (const [roleId, role] of rolesToRemove) {
        await member.roles.remove(role).catch(() => {});
      }
    }

    // Add new role
    const role = await guild.roles.fetch(targetReward.roleId).catch(() => null);
    if (role && role.editable) {
      await member.roles.add(role).catch(() => {});
    }
  }

  /**
   * Background worker for Top Leveler Role.
   */
  static async tickTopLevelerRole() {
    const lock = await RedisService.acquireLock('lock:leveling:top_role', 290);
    if (!lock) return;

    const allGuilds = await GuildService.getAllGuildSettings();
    for (const setting of allGuilds) {
      if (setting.topLevelerRoleId) {
        await this.processTopLevelerRole(setting.tenantId, setting.guildId, setting.topLevelerRoleId);
      }
    }
  }

  private static async processTopLevelerRole(tenantId: string, guildId: string, roleId: string) {
    try {
      const topUsers = await LevelingRepository.getTopLevelers(tenantId, guildId, 10);
      if (topUsers.length === 0) return;

      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const me = guild.members.me || await guild.members.fetch(client.user!.id);
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role || !role.editable) return;

      let topLeveler = null;
      for (const candidate of topUsers) {
        const member = await guild.members.fetch(candidate.userId).catch(() => null);
        if (member && member.roles.highest.position < me.roles.highest.position) {
          topLeveler = candidate;
          break;
        }
      }

      if (!topLeveler) return;

      const currentHolders = role.members;
      if (currentHolders.has(topLeveler.userId) && currentHolders.size === 1) return;

      for (const [id, member] of currentHolders) {
        if (id !== topLeveler.userId) await member.roles.remove(role).catch(() => {});
      }

      const winner = await guild.members.fetch(topLeveler.userId).catch(() => null);
      if (winner && !winner.roles.cache.has(roleId)) {
        await winner.roles.add(role).catch(() => {});
      }
    } catch (error) {
      // Fail silently
    }
  }
}
