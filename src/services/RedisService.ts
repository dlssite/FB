import Redis from 'ioredis';
import { flamebornConfig } from '../config/flameborn.config';
import { Logger } from '../utils/logger';

export class RedisService {
  private static instance: Redis | null = null;

  static get client(): Redis {
    if (!flamebornConfig.redis.enabled) {
      throw new Error('Redis is explicitly disabled in flameborn.config.ts');
    }

    if (!this.instance) {
      const config = flamebornConfig.redis;
      
      this.instance = new Redis(config.url, config.options);

      this.instance.on('connect', () => {
        Logger.info('Redis connection established.', 'RedisService' as any);
      });

      this.instance.on('error', (err) => {
        Logger.error('Redis connection error:', err);
      });
    }
    return this.instance;
  }

  /**
   * Safe check to see if Redis is actually usable.
   */
  static isAvailable(): boolean {
    return !!flamebornConfig.redis.enabled && !!flamebornConfig.redis.url;
  }

  /**
   * Performance optimized Multi-GET.
   */
  static async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    try {
      return await this.client.mget(...keys);
    } catch (err) {
      Logger.error(`Redis MGET failed for ${keys.length} keys`, err);
      return keys.map(() => null);
    }
  }

  /**
   * Safe wrapper for GET.
   */
  static async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      Logger.error(`Redis GET failed for key: ${key}`, err);
      return null;
    }
  }

  /**
   * Safe wrapper for SET with optional TTL.
   */
  static async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      Logger.error(`Redis SET failed for key: ${key}`, err);
    }
  }

  /**
   * Safe wrapper for DEL.
   */
  static async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      Logger.error(`Redis DEL failed for key: ${key}`, err);
    }
  }

  private static localLocks = new Map<string, number>();

  /**
   * Distributed Lock Implementation (Simple).
   * Returns true if lock was acquired.
   */
  static async acquireLock(lockName: string, ttlSeconds: number): Promise<boolean> {
    if (!flamebornConfig.redis.enabled) {
      // Graceful in-memory fallback lock when Redis is disabled
      const now = Date.now();
      const expiresAt = now + (ttlSeconds * 1000);
      const existingExpiration = this.localLocks.get(lockName);
      if (existingExpiration && existingExpiration > now) {
        return false;
      }
      this.localLocks.set(lockName, expiresAt);
      return true;
    }

    try {
      const result = await this.client.set(lockName, 'locked', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      return false;
    }
  }

  /**
   * Release a distributed lock.
   */
  static async releaseLock(lockName: string): Promise<void> {
    if (!flamebornConfig.redis.enabled) {
      this.localLocks.delete(lockName);
      return;
    }
    await this.del(lockName);
  }

  /**
   * Set Add (SADD)
   */
  static async sadd(key: string, member: string): Promise<number> {
    try {
      return await this.client.sadd(key, member);
    } catch (err) {
      Logger.error(`Redis SADD failed for key: ${key}`, err);
      return 0;
    }
  }

  /**
   * Set Cardinality (SCARD)
   */
  static async scard(key: string): Promise<number> {
    try {
      return await this.client.scard(key);
    } catch (err) {
      Logger.error(`Redis SCARD failed for key: ${key}`, err);
      return 0;
    }
  }

  /**
   * Increment (INCR)
   */
  static async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (err) {
      Logger.error(`Redis INCR failed for key: ${key}`, err);
      return 0;
    }
  }

  /**
   * Expire (EXPIRE)
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (err) {
      Logger.error(`Redis EXPIRE failed for key: ${key}`, err);
      return false;
    }
  }

  /**
   * Set Remove (SREM)
   */
  static async srem(key: string, member: string): Promise<number> {
    try {
      return await this.client.srem(key, member);
    } catch (err) {
      Logger.error(`Redis SREM failed for key: ${key}`, err);
      return 0;
    }
  }

  /**
   * Set Is Member (SISMEMBER)
   */
  static async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (err) {
      Logger.error(`Redis SISMEMBER failed for key: ${key}`, err);
      return false;
    }
  }

  /**
   * Set Members (SMEMBERS) — returns all members of a set
   */
  static async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (err) {
      Logger.error(`Redis SMEMBERS failed for key: ${key}`, err);
      return [];
    }
  }

  /**
   * Sorted Set Add (ZADD) — score is epoch seconds
   */
  static async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zadd(key, score, member);
    } catch (err) {
      Logger.error(`Redis ZADD failed for key: ${key}`, err);
      return 0;
    }
  }

  /**
   * Sorted Set Range By Score (ZRANGEBYSCORE)
   */
  static async zrangebyscore(key: string, min: number | string, max: number | string): Promise<string[]> {
    try {
      return await this.client.zrangebyscore(key, min, max);
    } catch (err) {
      Logger.error(`Redis ZRANGEBYSCORE failed for key: ${key}`, err);
      return [];
    }
  }

  /**
   * Sorted Set Remove (ZREM)
   */
  static async zrem(key: string, member: string): Promise<number> {
    try {
      return await this.client.zrem(key, member);
    } catch (err) {
      Logger.error(`Redis ZREM failed for key: ${key}`, err);
      return 0;
    }
  }
}
