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
    if (enabledModules.antiSpam) {
      const isSpamming = await this.checkSpam(message, settings);
      if (isSpamming) {
        await this.handleViolation(message, 'Chat Flooding (Spam)', tenantId, 'SPAM');
        await AutomodRepository.logViolation(message.guild.id, tenantId, message.author.id, 'SPAM', undefined, 'deleted');
        return true;
      }
    }

    // 3. Anti-Invite
    if (enabledModules.antiInvite) {
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
    if (enabledModules.antiLink) {
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
   * Get default punishment config
   */
  private static getDefaultPunishmentConfig() {
    return {
      antiSpam: {
        windowMs: 86400000, // 24 hours
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 3, action: 'warn', duration: null },
          { violations: 5, action: 'mute', duration: 300 },
          { violations: 10, action: 'kick', duration: null },
        ],
      },
      antiInvite: {
        windowMs: 86400000,
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 2, action: 'warn', duration: null },
          { violations: 4, action: 'mute', duration: 600 },
          { violations: 6, action: 'kick', duration: null },
        ],
      },
      antiLink: {
        windowMs: 86400000,
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 3, action: 'warn', duration: null },
          { violations: 5, action: 'mute', duration: 900 },
          { violations: 8, action: 'kick', duration: null },
        ],
      },
      antiNuke: {
        windowMs: 3600000, // 1 hour
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 1, action: 'warn', duration: null },
          { violations: 2, action: 'kick', duration: null },
        ],
      },
    };
  }

  /**
   * Get punishment escalation config for module
   */
  private static getPunishmentConfig(settings: any, violationType: string) {
    const defaultConfig = this.getDefaultPunishmentConfig() as Record<string, any>;
    
    // Map violation type names to config keys
    const typeMap: Record<string, string> = {
      'LINK': 'antiLink',
      'INVITE': 'antiInvite',
      'SPAM': 'antiSpam',
      'NUKE': 'antiNuke',
    };
    
    const configKey = typeMap[violationType] || violationType;
    
    if (!settings || !settings.punishmentConfig) {
      console.log(`[Automod] No custom config, using defaults for ${violationType} (key: ${configKey})`);
      return defaultConfig[configKey];
    }
    
    try {
      const config = JSON.parse(settings.punishmentConfig as any);
      const moduleConfig = config[configKey] || defaultConfig[configKey];
      console.log(`[Automod] Using config for ${violationType}:`, JSON.stringify(moduleConfig));
      return moduleConfig;
    } catch (e) {
      console.error(`[Automod] Failed to parse punishment config:`, e);
      return defaultConfig[configKey];
    }
  }

  /**
   * Determine what punishment should be applied based on violation count
   */
  private static getApplicablePunishment(escalation: any[], violationCount: number) {
    // Get all punishments that should trigger at or before this violation count
    const applicable = escalation.filter(e => e.violations <= violationCount);
    // Return the highest one
    return applicable.length > 0 ? applicable[applicable.length - 1] : null;
  }

  /**
   * Apply punishment to user
   */
  private static async applyPunishment(message: Message, punishment: any, tenantId: string) {
    try {
      if (!message.member || !message.guild) {
        console.log('[Automod] Cannot apply punishment - no member or guild');
        return;
      }

      const userTag = `<@${message.author.id}>`;

      switch (punishment.action) {
        case 'warn':
          console.log(`[Automod] Sending warning to ${message.author.tag}`);
          if ('send' in message.channel) {
            await message.channel.send({
              content: `⚠️ **Warning** ${userTag}: You are violating server rules. Please stop or further action will be taken.`,
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 8000)).catch(() => {});
          }
          break;

        case 'mute':
          const duration = (punishment.duration || 300) * 1000; // Convert to milliseconds
          console.log(`[Automod] Timing out ${message.author.tag} for ${duration}ms`);
          const timeoutResult = await message.member.timeout(duration, 'Automod escalation').catch((err: any) => {
            console.error('[Automod] Timeout error:', err);
            return null;
          });
          console.log(`[Automod] Timeout result:`, timeoutResult ? 'Success' : 'Failed');
          
          if ('send' in message.channel) {
            await message.channel.send({
              content: `🔇 ${userTag} has been timed out for ${punishment.duration || 300} seconds.`,
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
          }
          break;

        case 'kick':
          console.log(`[Automod] Kicking ${message.author.tag}`);
          await message.member.kick('Automod escalation - repeated violations').catch((err: any) => {
            console.error('[Automod] Kick error:', err);
          });
          if ('send' in message.channel) {
            await message.channel.send({
              content: `🚪 ${message.author.tag} has been kicked for repeated violations.`,
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
          }
          break;

        case 'ban':
          console.log(`[Automod] Banning ${message.author.tag}`);
          await message.guild.members.ban(message.author.id, { reason: 'Automod escalation - repeated violations' }).catch((err: any) => {
            console.error('[Automod] Ban error:', err);
          });
          if ('send' in message.channel) {
            await message.channel.send({
              content: `🚫 ${message.author.tag} has been banned for repeated violations.`,
            }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
          }
          break;
      }
    } catch (error) {
      console.error('[Automod] Error applying punishment:', error);
    }
  }

  /**
   * Standardized violation handler (Delete + Track + Escalate)
   */
  private static async handleViolation(message: Message, reason: string, tenantId: string, violationType: string) {
    try {
      // Always delete the message
      await message.delete().catch(() => {});

      // Get settings for punishment config
      const settings = await AutomodRepository.getSettings(tenantId, message.guild!.id);
      const punishmentConfig = this.getPunishmentConfig(settings, violationType);
      const windowMs = punishmentConfig?.windowMs || 86400000;

      console.log(`[Automod] Tracking violation for ${message.author.tag} - Type: ${violationType}, Window: ${windowMs}`);

      // Track violation and get current count
      const violationCount = await AutomodRepository.trackViolation(
        message.guild!.id,
        tenantId,
        message.author.id,
        violationType,
        windowMs
      );

      console.log(`[Automod] Violation #${violationCount} for user ${message.author.id}, Type: ${violationType}`);

      // Log the violation
      await AutomodRepository.logViolation(
        message.guild!.id,
        tenantId,
        message.author.id,
        violationType,
        undefined,
        'deleted'
      );

      // Send initial warning
      if ('send' in message.channel) {
        const warnMsg = await message.channel.send({
          content: `⚠️ ${message.author}, your message was removed by Automod: **${reason}** (Violation #${violationCount}).`,
        });
        setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
      }

      // Check if escalation is needed
      const escalation = punishmentConfig?.escalation || [];
      console.log(`[Automod] Escalation config:`, JSON.stringify(escalation));
      
      const punishment = this.getApplicablePunishment(escalation, violationCount);
      console.log(`[Automod] Applicable punishment:`, JSON.stringify(punishment));

      if (punishment && punishment.action !== 'delete') {
        console.log(`[Automod] Applying ${punishment.action} to ${message.author.tag}`);
        await this.applyPunishment(message, punishment, tenantId);
      }

      // Emit internal mod action
      client.emit('internalModAction', {
        guild: message.guild,
        tenantId,
        moderatorId: 'AUTOMOD',
        moderatorTag: 'Flameborn Automod',
        targetId: message.author.id,
        targetTag: message.author.tag,
        action: punishment?.action === 'delete' ? 'AUTOMOD_DELETION' : `AUTOMOD_${punishment?.action?.toUpperCase() || 'ACTION'}`,
        reason: `${reason} (Violation #${violationCount})`,
        color: '#EA5455',
      });
    } catch (error) {
      console.error('[Automod] Error handling violation:', error);
    }
  }
}
