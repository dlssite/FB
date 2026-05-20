import { Message, PermissionFlagsBits } from 'discord.js';
import { AutomodRepository } from '../database/AutomodRepository';
import { client } from '../../../core/FlamebornClient';
import { RedisService } from '../../../services/RedisService';

export class AutomodService {
  /**
   * Main entry point for the Automod pipeline.
   */
  static async processMessage(message: Message, tenantId: string): Promise<boolean> {
    // 1. Bypass checks (Bots or Admins)
    if (message.author.bot || !message.guild) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    // 2. Fetch settings (Prisma + Context)
    const settings = await AutomodRepository.getSettings(tenantId, message.guild.id);
    if (!settings) return false;

    // 3. Exemption Check (Roles & Channels)
    const exemptRoles = settings.exemptRoles as string[] || [];
    const exemptChannels = settings.exemptChannels as string[] || [];

    if (exemptChannels.includes(message.channel.id)) return false;
    if (message.member?.roles.cache.some(role => exemptRoles.includes(role.id))) return false;

    const content = message.content.toLowerCase();

    // 4. Interceptor: Anti-Spam (5 msgs / 3s)
    if (settings.antiSpam) {
      const isSpamming = await this.checkSpam(message);
      if (isSpamming) {
        await this.handleViolation(message, 'Chat Flooding (Spam)', tenantId);
        return true;
      }
    }

    // 5. Interceptor: Anti-Invite
    if (settings.antiInvite) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
      if (inviteRegex.test(content)) {
        await this.handleViolation(message, 'Anti-Invite Link', tenantId);
        return true;
      }
    }

    // 6. Interceptor: Banned Words
    const bannedWords = settings.bannedWords as string[] || [];
    if (bannedWords.length > 0) {
      for (const word of bannedWords) {
        if (content.includes(word.toLowerCase())) {
          await this.handleViolation(message, 'Banned Language', tenantId);
          return true;
        }
      }
    }

    // 7. Interceptor: Anti-Link (Generic)
    if (settings.antiLink) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (urlRegex.test(content)) {
        await this.handleViolation(message, 'External Links', tenantId);
        return true;
      }
    }

    return false;
  }

  private static async checkSpam(message: Message): Promise<boolean> {
    const key = `spam:${message.guildId}:${message.author.id}`;
    const cached = await RedisService.get(key);
    const now = Date.now();
    
    let data = cached ? JSON.parse(cached) : { count: 0, lastMessage: 0 };

    if (now - data.lastMessage < 3000) { // 3 second window
      data.count++;
    } else {
      data.count = 1;
    }

    data.lastMessage = now;
    await RedisService.set(key, JSON.stringify(data), 10); // 10 second TTL for spam state

    return data.count >= 5;
  }

  /**
   * Standardized violation handler (Delete + Warn + Emit Event)
   */
  private static async handleViolation(message: Message, reason: string, tenantId: string) {
    try {
      await message.delete().catch(() => {});
      
      if (!('send' in message.channel)) return;

      const warnMsg = await message.channel.send({
        content: `⚠️ ${message.author}, your message was removed by Automod: **${reason}**.`
      });

      // Fire an internal event so the Moderation module can log it (Decoupled Architecture)
      client.emit('internalModAction', {
        guild: message.guild,
        tenantId,
        moderatorId: 'AUTOMOD',
        moderatorTag: 'Flameborn Automod',
        targetId: message.author.id,
        targetTag: message.author.tag,
        action: 'AUTOMOD_DELETION',
        reason,
        color: '#EA5455'
      });

      // Auto-clean the warning after 5 seconds
      setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
    } catch (error) {
      console.error('[Automod] Error handling violation:', error);
    }
  }
}
