import { RedisService } from '../../../services/RedisService';
import { AiRepository } from '../database/AiRepository';
import { flamebornConfig } from '../../../config/flameborn.config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CachedUserProfile {
  identity: { bio: string; title: string; privacyMode: boolean };
  moduleStats: Record<string, any>;
  actions: Array<{ action: string; description: string }>;
  cachedAt: number;
}

export class MemoryService {
  // User-level history key
  private static getUserHistoryKey(channelId: string, userId: string) {
    return `ai:history:${channelId}:${userId}`;
  }

  // Legacy channel-level history key (for backward compatibility)
  private static getChannelHistoryKey(channelId: string) {
    return `ai:history:${channelId}`;
  }

  // Summary cache key
  private static getSummaryKey(channelId: string, userId: string) {
    return `ai:summary:${channelId}:${userId}`;
  }

  // User metadata key
  private static getUserMetadataKey(channelId: string, userId: string) {
    return `ai:meta:${channelId}:${userId}`;
  }

  private static getProfileCacheKey(tenantId: string, userId: string) {
    return `ai:profile:${tenantId}:${userId}`;
  }

  /**
   * Add message to user's short-term memory (per-user isolated)
   */
  static async addShortTermMemory(channelId: string, message: ChatMessage, userId?: string) {
    if (!flamebornConfig.redis.enabled) return;
    
    // If userId provided, store in user-isolated container
    if (userId) {
      const key = this.getUserHistoryKey(channelId, userId);
      try {
        await RedisService.client.rpush(key, JSON.stringify(message));
        await RedisService.client.ltrim(key, -20, -1); // Keep last 20 messages (sliding window)
        await RedisService.client.expire(key, 3600); // 1 hour TTL
      } catch (err) {
        // Ignore redis errors
      }
    }
  }

  /**
   * Get user's short-term memory (per-user isolated history)
   */
  static async getShortTermMemory(channelId: string, userId?: string): Promise<ChatMessage[]> {
    if (!flamebornConfig.redis.enabled) return [];
    
    const key = userId 
      ? this.getUserHistoryKey(channelId, userId)
      : this.getChannelHistoryKey(channelId); // Fallback for legacy code
    
    try {
      const raw = await RedisService.client.lrange(key, 0, -1);
      return raw.map(r => JSON.parse(r) as ChatMessage);
    } catch (err) {
      return [];
    }
  }

  /**
   * Get all users' histories in a channel (for summarization)
   */
  static async getAllUserHistories(channelId: string): Promise<Map<string, ChatMessage[]>> {
    if (!flamebornConfig.redis.enabled) return new Map();

    const result = new Map<string, ChatMessage[]>();
    try {
      // Scan for keys matching ai:history:{channelId}:{userId}
      const pattern = `ai:history:${channelId}:*`;
      let cursor = '0';
      
      do {
        const [newCursor, keys] = await (RedisService.client as any).scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;

        for (const key of keys) {
          const raw = await RedisService.client.lrange(key, 0, -1);
          const messages = raw.map(r => JSON.parse(r) as ChatMessage);
          const userId = key.split(':').pop();
          if (userId) {
            result.set(userId, messages);
          }
        }
      } while (cursor !== '0');
    } catch (err) {
      // Ignore redis errors
    }
    return result;
  }

  /**
   * Cache a conversation summary for a user
   */
  static async cacheConversationSummary(channelId: string, userId: string, summary: string, ttlSeconds: number = 1800) {
    if (!flamebornConfig.redis.enabled) return;

    const key = this.getSummaryKey(channelId, userId);
    try {
      await RedisService.client.setex(key, ttlSeconds, summary);
    } catch (err) {
      // Ignore redis errors
    }
  }

  /**
   * Get cached conversation summary
   */
  static async getCachedSummary(channelId: string, userId: string): Promise<string | null> {
    if (!flamebornConfig.redis.enabled) return null;

    const key = this.getSummaryKey(channelId, userId);
    try {
      return await RedisService.client.get(key);
    } catch (err) {
      return null;
    }
  }

  /**
   * Store user metadata (username, roles, etc) for reference
   */
  static async setUserMetadata(channelId: string, userId: string, metadata: Record<string, any>, ttlSeconds: number = 3600) {
    if (!flamebornConfig.redis.enabled) return;

    const key = this.getUserMetadataKey(channelId, userId);
    try {
      await RedisService.client.setex(key, ttlSeconds, JSON.stringify(metadata));
    } catch (err) {
      // Ignore redis errors
    }
  }

  /**
   * Get user metadata
   */
  static async getUserMetadata(channelId: string, userId: string): Promise<Record<string, any> | null> {
    if (!flamebornConfig.redis.enabled) return null;

    const key = this.getUserMetadataKey(channelId, userId);
    try {
      const data = await RedisService.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Cache a user's profile data (identity, stats, actions)
   */
  static async cacheUserProfile(tenantId: string, userId: string, profileData: CachedUserProfile, ttlSeconds: number = 3600) {
    if (!flamebornConfig.redis.enabled) return;

    const key = this.getProfileCacheKey(tenantId, userId);
    try {
      const cacheEntry = {
        ...profileData,
        cachedAt: Date.now()
      };
      await RedisService.client.setex(key, ttlSeconds, JSON.stringify(cacheEntry));
    } catch (err) {
      // Ignore redis errors
    }
  }

  /**
   * Retrieve cached user profile
   */
  static async getCachedUserProfile(tenantId: string, userId: string): Promise<CachedUserProfile | null> {
    if (!flamebornConfig.redis.enabled) return null;

    const key = this.getProfileCacheKey(tenantId, userId);
    try {
      const cached = await RedisService.client.get(key);
      if (cached) {
        return JSON.parse(cached) as CachedUserProfile;
      }
    } catch (err) {
      // Ignore redis errors
    }
    return null;
  }

  static async getLongTermFacts(tenantId: string, guildId: string, userId: string) {
    return AiRepository.getMemories(tenantId, guildId, userId);
  }

  static async addFact(tenantId: string, guildId: string, userId: string, factType: string, factKey: string, factValue: string) {
    return AiRepository.addMemory(tenantId, guildId, userId, factType, factKey, factValue);
  }
}
