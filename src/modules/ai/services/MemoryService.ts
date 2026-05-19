import { RedisService } from '../../../services/RedisService';
import { AiRepository } from '../database/AiRepository';
import { flamebornConfig } from '../../../config/flameborn.config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class MemoryService {
  private static getHistoryKey(channelId: string) {
    return `ai:history:${channelId}`;
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

  static async getLongTermFacts(tenantId: string, guildId: string, userId: string) {
    return AiRepository.getMemories(tenantId, guildId, userId);
  }

  static async addFact(tenantId: string, guildId: string, userId: string, factType: string, factKey: string, factValue: string) {
    return AiRepository.addMemory(tenantId, guildId, userId, factType, factKey, factValue);
  }
}
