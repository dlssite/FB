import { Message, PermissionFlagsBits } from 'discord.js';
import { AutomodRepository } from '../database/AutomodRepository';
import { AutomodExemptionService } from './AutomodExemptionService';
import { client } from '../../../core/FlamebornClient';
import { RedisService } from '../../../services/RedisService';

export class AutomodService {
  /**
   * Main entry point for the Automod pipeline.
   */
  static async processMessage(message: Message, tenantId: string): Promise<boolean> {
    if (message.author.bot || !message.guild) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    const settings = await AutomodRepository.getSettings(tenantId, message.guild.id);
    if (!settings || !settings.enabled) return false;

    // 1. Check exemptions (roles, channels, categories, users)
    if (await AutomodExemptionService.isExempt(message, tenantId)) {
      return false;
    }

    const content = message.content.toLowerCase();
    const enabledModules = settings.enabledModules as Record<string, boolean> || {};

    // 2. Anti-Spam
    if (enabledModules.antiSpam && settings.antiSpam) {
      const isSpamming = await this.checkSpam(message, settings);
      if (isSpamming) {
        await this.handleViolation(message, 'Chat Flooding (Spam)', tenantId, 'SPAM');
        await AutomodRepository.logViolation(message.guild.id, tenantId, message.author.id, 'SPAM', undefined, 'deleted');
        return true;
      }
    }

    // 3. Anti-Invite
    if (enabledModules.antiInvite && settings.antiInvite) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
      if (inviteRegex.test(content)) {
        await this.handleViolation(message, 'Anti-Invite Link', tenantId, 'INVITE');
        await AutomodRepository.logViolation(
          message.guild.id,
          tenantId,
          message.author.id,
          'INVITE',
          content.match(inviteRegex)?.[0],
          'deleted'
        );
        return true;
      }
    }

    // 4. Banned Words
    const bannedWords = (settings.bannedWords as string[]) || [];
    if (bannedWords.length > 0) {
      for (const word of bannedWords) {
        if (content.includes(word.toLowerCase())) {
          await this.handleViolation(message, 'Banned Language', tenantId, 'BANNED_WORD');
          await AutomodRepository.logViolation(
            message.guild.id,
            tenantId,
            message.author.id,
            'BANNED_WORD',
            word,
            'deleted'
          );
          return true;
        }
      }
    }

    // 5. Anti-Link
    if (enabledModules.antiLink && settings.antiLink) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (urlRegex.test(content)) {
        await this.handleViolation(message, 'External Links', tenantId, 'LINK');
        await AutomodRepository.logViolation(
          message.guild.id,
          tenantId,
          message.author.id,
          'LINK',
          content.match(urlRegex)?.[0],
          'deleted'
        );
        return true;
      }
    }

    return false;
  }

  private static async checkSpam(message: Message, settings: any): Promise<boolean> {
    const threshold = settings.spamThreshold || 5;
    const window = settings.spamWindow || 3000;
    const key = `spam:${message.guildId}:${message.author.id}`;
    const cached = await RedisService.get(key);
    const now = Date.now();

    let data = cached ? JSON.parse(cached) : { count: 0, lastMessage: 0 };

    if (now - data.lastMessage < window) {
      data.count++;
    } else {
      data.count = 1;
    }

    data.lastMessage = now;
    await RedisService.set(key, JSON.stringify(data), Math.ceil(window / 1000) + 5);

    return data.count >= threshold;
  }

  /**
   * Standardized violation handler (Delete + Warn + Emit Event)
   */
  private static async handleViolation(message: Message, reason: string, tenantId: string, violationType: string) {
    try {
      await message.delete().catch(() => {});

      if (!('send' in message.channel)) return;

      const warnMsg = await message.channel.send({
        content: `⚠️ ${message.author}, your message was removed by Automod: **${reason}**.`,
      });

      client.emit('internalModAction', {
        guild: message.guild,
        tenantId,
        moderatorId: 'AUTOMOD',
        moderatorTag: 'Flameborn Automod',
        targetId: message.author.id,
        targetTag: message.author.tag,
        action: 'AUTOMOD_DELETION',
        reason,
        color: '#EA5455',
      });

      setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
    } catch (error) {
      console.error('[Automod] Error handling violation:', error);
    }
  }
}
