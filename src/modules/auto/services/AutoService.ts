import { prisma } from '../../../database/client';
import { Collection } from 'discord.js';
import { Logger } from '../../../utils/logger';

export enum MatchType {
  EXACT = 'EXACT',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  REGEX = 'REGEX'
}

export interface AutoTrigger {
  id: string;
  tenantId: string;
  guildId: string;
  name: string;
  trigger: string;
  matchType: string;
  ignoreCase: boolean;
  channels: string[];
  roles: string[];
  replyTexts: string[];
  replyMedia: string | null;
  useEmbed: boolean;
  reactions: string[];
  cooldown: number;
  chance: number;
}

export class AutoService {
  // Cache of triggers per guild: Map<guildId, AutoTrigger[]>
  private static cache: Collection<string, AutoTrigger[]> = new Collection();
  
  // Cooldown tracking: Map<triggerId_userId, timestamp>
  private static cooldowns: Collection<string, number> = new Collection();

  /**
   * Initializes or refreshes the cache for a specific guild
   */
  public static async loadGuildCache(tenantId: string, guildId: string): Promise<AutoTrigger[]> {
    const triggers = await prisma.auto_triggers.findMany({
      where: { tenantId, guildId }
    });
    
    // We map it to avoid holding the Prisma object tightly, and ensure array types are respected
    const parsedTriggers: AutoTrigger[] = triggers.map(t => ({
      ...t,
      channels: t.channels as string[],
      roles: t.roles as string[],
      replyTexts: t.replyTexts as string[],
      reactions: t.reactions as string[]
    }));

    this.cache.set(guildId, parsedTriggers);
    return parsedTriggers;
  }

  /**
   * Retrieves triggers from cache, loading them if they don't exist
   */
  public static async getTriggers(tenantId: string, guildId: string): Promise<AutoTrigger[]> {
    if (!this.cache.has(guildId)) {
      return await this.loadGuildCache(tenantId, guildId);
    }
    return this.cache.get(guildId) || [];
  }

  /**
   * Clears the cache for a specific guild (used after creations/deletions)
   */
  public static clearCache(guildId: string) {
    this.cache.delete(guildId);
  }

  /**
   * Evaluates if a trigger matches the message content
   */
  public static isMatch(content: string, trigger: AutoTrigger): boolean {
    const targetContent = trigger.ignoreCase ? content.toLowerCase() : content;
    const triggerText = trigger.ignoreCase ? trigger.trigger.toLowerCase() : trigger.trigger;

    Logger.debug(`[AUTO:MATCH] Evaluating "${trigger.name}" (Type: ${trigger.matchType}) | Pattern: "${triggerText}" | Content: "${targetContent}"`, 'ACTION_ENGINE' as any);

    let result = false;
    switch (trigger.matchType) {
      case MatchType.EXACT:
        result = targetContent === triggerText;
        break;
      
      case MatchType.STARTS_WITH:
        result = targetContent.startsWith(triggerText);
        break;
      
      case MatchType.REGEX:
        try {
          const flags = trigger.ignoreCase ? 'i' : '';
          const regex = new RegExp(trigger.trigger, flags);
          result = regex.test(content);
        } catch {
          result = false;
        }
        break;
      
      case MatchType.CONTAINS:
      default:
        const escaped = triggerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escaped}`, trigger.ignoreCase ? 'i' : '');
        result = regex.test(content);
        break;
    }

    if (result) Logger.debug(`[AUTO:MATCH] Match found for "${trigger.name}"!`, 'ACTION_ENGINE' as any);
    return result;
  }

  /**
   * Checks if a user is currently on cooldown for a specific trigger
   */
  public static isOnCooldown(triggerId: string, userId: string, cooldownSeconds: number): boolean {
    if (cooldownSeconds <= 0) return false;

    const key = `${triggerId}_${userId}`;
    const now = Date.now();
    const expirationTime = this.cooldowns.get(key);

    if (expirationTime && now < expirationTime) {
      return true;
    }

    // Set new cooldown
    this.cooldowns.set(key, now + (cooldownSeconds * 1000));
    return false;
  }
}
