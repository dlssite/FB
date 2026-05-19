import { CountingRepository } from '../database/CountingRepository';
import { EconomyRepository } from '../../economy/database/EconomyRepository';
import { LedgerService } from '../../economy/services/LedgerService';
import { LevelingService } from '../../leveling/services/LevelingService';
import { RedisService } from '../../../services/RedisService';
import { client } from '../../../core/FlamebornClient';
import { Translator } from '../../../core/Translator';
import { Logger } from '../../../utils/logger';

export class CountingService {
  /**
   * Evaluates a mathematical string safely.
   */
  static evaluateMath(input: string): number | null {
    // Basic cleaning: remove spaces, allow only numbers and basic operators
    const sanitized = input.replace(/\s+/g, '');
    if (!/^[0-9+\-*/().]+$/.test(sanitized)) return null;

    try {
      // Use Function constructor for a slightly safer eval, 
      // though in a production bot a proper parser like mathjs is better.
      const result = new Function(`return ${sanitized}`)();
      return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Processes a new message in the counting channel.
   */
  static async handleCount(tenantId: string, guildId: string, userId: string, content: string, message: any) {
    const settings = await CountingRepository.getSettings(tenantId, guildId);
    if (!settings.channelId || message.channelId !== settings.channelId) return;

    // 1. Double Counting Check
    if (settings.lastUserId === userId && settings.currentCount > 0) {
      return await this.handleFailure(tenantId, guildId, userId, message, settings, 'DOUBLE');
    }

    // 2. Parse Number/Math
    let providedNumber = parseInt(content, 10);
    if (isNaN(providedNumber)) {
      providedNumber = this.evaluateMath(content) || -1;
    }

    const nextNumber = settings.currentCount + 1;

    // 3. Validation
    if (providedNumber !== nextNumber) {
      return await this.handleFailure(tenantId, guildId, userId, message, settings, 'WRONG', nextNumber);
    }

    // 4. Success Logic
    await CountingRepository.updateSettings(tenantId, guildId, {
      currentCount: nextNumber,
      highestCount: Math.max(settings.highestCount, nextNumber),
      lastUserId: userId
    });

    await CountingRepository.updateUserStats(tenantId, guildId, userId, 'success');
    await message.react('✅');

    // --- GOLDEN RECORD DROP (1% chance) ---
    if (Math.random() < 0.01) {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'golden_record', 1);
      await message.channel.send(`✨ **LEGENDARY DROP!** **<@${userId}>** found a **Golden Record** while counting! Use it in a voice channel to trigger a **Golden Hour**!`);
    }

    // 5. Creative Mechanics: Blessed/Cursed/Milestones
    await this.processCreativeEvents(tenantId, guildId, userId, nextNumber, message);
  }

  private static async handleFailure(tenantId: string, guildId: string, userId: string, message: any, settings: any, reason: 'DOUBLE' | 'WRONG', nextNumber?: number) {
    // Check for Temporal Rewind (Saves the user from the shame and XP loss)
    const inventory = await EconomyRepository.getInventory(tenantId, userId);
    const hasSave = inventory.find(i => i.itemName === 'temporal_rewind' && i.quantity > 0);

    if (hasSave) {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'temporal_rewind', -1);
      await CountingRepository.updateUserStats(tenantId, guildId, userId, 'save');
      
      await message.reply({ content: `⏳ **A rift in time opened!** Your mistake was undone by a **Temporal Rewind**! The count remains at **${settings.currentCount}**.` });
      return;
    }

    // Penalize the "Ruiner" but don't reset the count (as per user request)
    await CountingRepository.updateUserStats(tenantId, guildId, userId, 'ruin');
    await message.react('⚠️');

    // Deduct XP (e.g., 500 XP penalty for trying to ruin the count)
    await LevelingService.addExperience(tenantId, guildId, userId, -500);

    const ctx = (client as any).tenantStorage?.getStore();
    const lang = ctx?.lang || 'en';

    let failMsg = '';
    if (reason === 'DOUBLE') {
      failMsg = Translator.t('counting', 'messages.ruined_double', lang, { user: userId, next: settings.currentCount + 1 });
    } else {
      failMsg = Translator.t('counting', 'messages.ruined', lang, { user: userId, next: nextNumber });
    }

    // 4. Delete the "ruining" message to keep the channel clean (as per user request)
    await message.delete().catch(() => {});

    const warning = await message.channel.send(failMsg);
    
    // Auto-delete the warning after 5 seconds to keep the channel pristine
    setTimeout(() => {
      warning.delete().catch(() => {});
    }, 5000);
  }

  private static async processCreativeEvents(tenantId: string, guildId: string, userId: string, count: number, message: any) {
    // Milestone every 100
    if (count % 100 === 0) {
      await message.channel.send(`🎉 **MILESTONE REACHED!** We have successfully reached **${count}**! Everyone gets a small XP boost.`);
      // Logic for group rewards could go here
    }

    // Blessed Number (Random chance)
    if (Math.random() < 0.05) {
      const emberBonus = Math.floor(Math.random() * 500) + 100;
      await EconomyRepository.updateBalance(tenantId, userId, { embers: emberBonus });
      await message.channel.send(`✨ **BLESSED NUMBER!** **<@${userId}>** hit the jackpot and received **${emberBonus}** Embers!`);
      await message.react('✨');
    }

    // Cursed Number (Random chance)
    if (Math.random() < 0.02) {
      await message.channel.send(`☠️ **CURSED NUMBER!** **<@${userId}>** bravely counted the cursed number **${count}** and took a hit for the server, but earned a legendary XP bounty!`);
      await LevelingService.addExperience(tenantId, guildId, userId, 1000, message.channelId);
      await message.react('☠️');
    }
  }

  /**
   * Background worker to manage the Top Counter Role.
   */
  static async tickTopCounterRole() {
    const lock = await RedisService.acquireLock('lock:counting:top_role', 290);
    if (!lock) return;

    const { prisma } = await import('../../../database/client');
    const allSettings = await prisma.counting_settings.findMany({
      where: { topRoleId: { not: null } }
    });

    for (const setting of allSettings) {
      if (setting.topRoleId) {
        await this.processTopRoleAssignment(setting.tenantId, setting.guildId, setting.topRoleId);
      }
    }
  }

  private static async processTopRoleAssignment(tenantId: string, guildId: string, roleId: string) {
    try {
      const topUsers = await CountingRepository.getLeaderboard(tenantId, guildId, 1);
      if (topUsers.length === 0) return;

      const topUser = topUsers[0];
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role || !role.editable) return;

      const currentHolders = role.members;
      if (currentHolders.has(topUser.userId) && currentHolders.size === 1) return;

      for (const [id, member] of currentHolders) {
        if (id !== topUser.userId) await member.roles.remove(role).catch(() => {});
      }

      const winner = await guild.members.fetch(topUser.userId).catch(() => null);
      if (winner && !winner.roles.cache.has(roleId)) {
        await winner.roles.add(role).catch(() => {});
      }
    } catch (error) {
      Logger.error(`[Counting] Failed to assign top role in ${guildId}`, error as any);
    }
  }
}
