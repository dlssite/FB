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
  private static getHistoryKey(channelId: string) {
    return `ai:history:${channelId}`;
  }

  private static getProfileCacheKey(tenantId: string, userId: string) {
    return `ai:profile:${tenantId}:${userId}`;
  }

  static async addShortTermMemory(channelId: string, message: ChatMessage) {
    if (!flamebornConfig.redis.enabled) return;
    
    const key = this.getHistoryKey(channelId);
    try {
      await RedisService.client.rpush(key, JSON.stringify(message));
      await RedisService.client.ltrim(key, -20, -1); // Keep last 20 messages (sliding window)
      await RedisService.client.expire(key, 3600); // 1 hour TTL
    } catch (err) {
      // Ignore redis errors
    }
  }

  static async getShortTermMemory(channelId: string): Promise<ChatMessage[]> {
    if (!flamebornConfig.redis.enabled) return [];
    
    const key = this.getHistoryKey(channelId);
    try {
      const raw = await RedisService.client.lrange(key, 0, -1);
      return raw.map(r => JSON.parse(r) as ChatMessage);
    } catch (err) {
      return [];
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
