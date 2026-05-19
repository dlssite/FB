import { StreakRepository } from '../database/StreakRepository';
import { EconomyRepository } from '../../economy/database/EconomyRepository';
import { LedgerService } from '../../economy/services/LedgerService';
import { LevelingRepository } from '../../leveling/database/LevelingRepository';
import { LevelingService } from '../../leveling/services/LevelingService';
import { RedisService } from '../../../services/RedisService';
import { GuildService } from '../../../services/GuildService';
import { client } from '../../../core/FlamebornClient';
import { Translator } from '../../../core/Translator';
import { Logger } from '../../../utils/logger';

export class StreakService {
  /**
   * Attempts to claim a daily streak.
   */
  static async claimStreak(tenantId: string, guildId: string, userId: string, member: any, channelId: string) {
    const settings = await StreakRepository.getSettings(tenantId, guildId);
    if (!settings.enabled) {
      return { success: false, reason: 'DISABLED' };
    }

    const user = await StreakRepository.getUser(tenantId, guildId, userId);
    const now = new Date();
    
    let isFrozen = false;
    let streakBroken = false;
    let previousStreak = user.currentStreak;

    // Fetch user inventory
    const inventory = await EconomyRepository.getInventory(tenantId, userId);

    if (user.lastClaimedAt) {
      const hoursSince = (now.getTime() - new Date(user.lastClaimedAt).getTime()) / 3600000;

      if (hoursSince < 24) {
        return { success: false, reason: 'COOLDOWN', hoursSince };
      }

      // Check missed days
      if (hoursSince > 48) {
        let missedDays = Math.floor((hoursSince - 24) / 24);
        let freezeUsed = '';

        if (missedDays === 1) {
          if (inventory.find(i => i.itemName === 'streak_freeze_1' && i.quantity > 0)) freezeUsed = 'streak_freeze_1';
          else if (inventory.find(i => i.itemName === 'streak_freeze_2' && i.quantity > 0)) freezeUsed = 'streak_freeze_2';
          else if (inventory.find(i => i.itemName === 'streak_freeze_3' && i.quantity > 0)) freezeUsed = 'streak_freeze_3';
        } else if (missedDays === 2) {
          if (inventory.find(i => i.itemName === 'streak_freeze_2' && i.quantity > 0)) freezeUsed = 'streak_freeze_2';
          else if (inventory.find(i => i.itemName === 'streak_freeze_3' && i.quantity > 0)) freezeUsed = 'streak_freeze_3';
        } else if (missedDays === 3) {
          if (inventory.find(i => i.itemName === 'streak_freeze_3' && i.quantity > 0)) freezeUsed = 'streak_freeze_3';
        }

        if (freezeUsed !== '') {
          await EconomyRepository.updateItemQuantity(tenantId, userId, freezeUsed, -1);
          isFrozen = true;
        } else {
          streakBroken = true;
          previousStreak = user.currentStreak;
          user.currentStreak = 0; // Reset streak
        }
      }
    }

    // Increment streak
    const newStreak = user.currentStreak + 1;
    const isNewRecord = newStreak > user.longestStreak;
    
    // Update Streak Data
    await StreakRepository.updateStreak(tenantId, guildId, userId, {
      currentStreak: newStreak,
      longestStreak: isNewRecord ? newStreak : user.longestStreak,
      lastClaimedAt: now,
      freezesUsed: isFrozen ? { increment: 1 } : undefined
    });

    // --- REWARDS ---
    // Check for catalysts
    let virtualStreak = newStreak;
    const hasLeapToken = inventory.find(i => i.itemName === 'streak_multiplier_token' && i.quantity > 0);
    if (hasLeapToken && !streakBroken) {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'streak_multiplier_token', -1);
      virtualStreak += 10;
    }

    const multiplier = 1 + (virtualStreak * settings.streakMultiplier);
    
    // 1. Embers
    let embersEarned = Math.floor(settings.baseEmberReward * multiplier);
    const hasEmberBoost = inventory.find(i => i.itemName === 'streak_ember_boost' && i.quantity > 0);
    if (hasEmberBoost && !streakBroken) {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'streak_ember_boost', -1);
      embersEarned *= 2;
    }

    await EconomyRepository.updateBalance(tenantId, userId, { embers: embersEarned });
    await LedgerService.log({
      tenantId,
      userId,
      type: 'INCOME',
      category: 'STREAK',
      amount: embersEarned,
      reason: `Claimed daily streak (Day ${newStreak})`
    });

    // 2. XP
    let xpEarned = Math.floor(settings.baseXpReward * multiplier);
    const hasXpBoost = inventory.find(i => i.itemName === 'streak_xp_boost' && i.quantity > 0);
    if (hasXpBoost && !streakBroken) {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'streak_xp_boost', -1);
      xpEarned *= 2;
    }

    let levelingUser = await LevelingRepository.getUser(tenantId, guildId, userId);
    let currentXp = Number(levelingUser?.xp || 0) + xpEarned;
    let currentLevel = Number(levelingUser?.level || 1);

    const xpNeeded = LevelingService.getXpRequired(currentLevel);
    if (currentXp >= xpNeeded) {
      currentLevel++;
      currentXp = 0;
    }
    await LevelingRepository.updateXp(tenantId, guildId, userId, currentXp, currentLevel);

    // 3. Milestone Roles
    await this.processMilestoneRoles(tenantId, guildId, userId, member, newStreak, settings);

    return {
      success: true,
      streak: newStreak,
      isFrozen,
      streakBroken,
      lost: streakBroken ? previousStreak : 0,
      rewards: { xp: xpEarned, embers: embersEarned }
    };
  }

  /**
   * Evaluates and assigns milestone roles.
   */
  private static async processMilestoneRoles(tenantId: string, guildId: string, userId: string, member: any, currentStreak: number, settings: any) {
    if (!settings.milestoneRoles) return;
    const milestones = settings.milestoneRoles as { day: number, roleId: string }[];
    if (!Array.isArray(milestones)) return;

    const milestone = milestones.find(m => m.day === currentStreak);
    if (!milestone) return;

    try {
      await member.roles.add(milestone.roleId);
    } catch (err) {
      Logger.error(`[Streaks] Failed to add milestone role ${milestone.roleId} to ${userId}`, err);
    }
  }

  /**
   * Background worker to manage the Top Streaker Role.
   */
  static async tickTopStreakerRole() {
    const lock = await RedisService.acquireLock('lock:streaks:top_role', 290);
    if (!lock) return;

    // We fetch settings directly via Prisma because GuildService doesn't cache streak_settings yet.
    const { prisma } = await import('../../../database/client');
    const allSettings = await prisma.streak_settings.findMany({
      where: { enabled: true, topStreakRoleId: { not: null } }
    });

    for (const setting of allSettings) {
      if (setting.topStreakRoleId) {
        await this.processTopStreakRole(setting.tenantId, setting.guildId, setting.topStreakRoleId);
      }
    }
  }

  private static async processTopStreakRole(tenantId: string, guildId: string, roleId: string) {
    try {
      const topUsers = await StreakRepository.getTopStreaks(tenantId, guildId, 10);
      if (topUsers.length === 0) return;

      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const me = guild.members.me || await guild.members.fetch(client.user!.id);
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role || !role.editable) return;

      let topStreaker = null;
      for (const candidate of topUsers) {
        let member = guild.members.cache.get(candidate.userId);
        if (!member) member = await guild.members.fetch(candidate.userId).catch(() => null) || undefined;
        
        if (member && member.roles.highest.position < me.roles.highest.position) {
          topStreaker = candidate;
          break;
        }
      }

      if (!topStreaker) return;

      const currentHolders = role.members;
      if (currentHolders.has(topStreaker.userId) && currentHolders.size === 1) return;

      for (const [id, member] of currentHolders) {
        if (id !== topStreaker.userId) await member.roles.remove(role).catch(() => {});
      }

      const winner = await guild.members.fetch(topStreaker.userId).catch(() => null);
      if (winner && !winner.roles.cache.has(roleId)) {
        await winner.roles.add(role).catch(() => {});
      }
    } catch (error) {
      // Fail silently for isolated guild errors
    }
  }
}
