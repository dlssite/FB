import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';
import { Logger } from '../../../utils/logger';

const GIVEAWAY_META_TTL = 86400 * 7; // 7 day max cache (endTime TTL is shorter in practice)

export class GiveawayRepository {
  // ─── Redis Key Helpers ───────────────────────────────────────────────────────
  static metaKey(tenantId: string, messageId: string) {
    return `giveaway:meta:${tenantId}:${messageId}`;
  }
  static entryKey(giveawayId: number) {
    return `giveaway:entries:${giveawayId}`;
  }
  static scheduleKey() {
    return `giveaway:schedule`;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────
  static async createGiveaway(data: {
    tenantId: string;
    guildId: string;
    channelId: string;
    messageId: string;
    hostId: string;
    sponsorId?: string | null;
    duration: number;
    winners: number;
    prize: string;
    roleId?: string | null;
    requirements?: any;
    color?: string | null;
    endTime: Date;
    description?: string | null;
    drop?: boolean;
  }) {
    const giveaway = await prisma.giveaways.create({
      data: {
        tenantId: data.tenantId,
        guildId: data.guildId,
        channelId: data.channelId,
        messageId: data.messageId,
        hostId: data.hostId,
        sponsorId: data.sponsorId,
        duration: data.duration,
        winners: data.winners,
        prize: data.prize,
        roleId: data.roleId,
        requirements: data.requirements || {},
        color: data.color,
        endTime: data.endTime,
        description: data.description,
        drop: data.drop || false,
        ended: false,
      },
    });

    // Cache metadata in Redis
    const ttl = Math.max(60, Math.floor((data.endTime.getTime() - Date.now()) / 1000) + 300);
    await RedisService.set(
      this.metaKey(data.tenantId, data.messageId),
      JSON.stringify({ ...giveaway, endTime: giveaway.endTime?.toISOString() }),
      Math.min(ttl, GIVEAWAY_META_TTL)
    );

    // Register in sorted-set scheduler (only for timed giveaways)
    if (!data.drop) {
      await RedisService.zadd(
        this.scheduleKey(),
        Math.floor(data.endTime.getTime() / 1000),
        `${data.tenantId}:${data.messageId}`
      );
    }

    return giveaway;
  }

  // ─── Read (cache-aside) ──────────────────────────────────────────────────────
  static async getGiveaway(tenantId: string, messageId: string) {
    // L1: Redis
    const cached = await RedisService.get(this.metaKey(tenantId, messageId));
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.endTime) parsed.endTime = new Date(parsed.endTime);
        return parsed;
      } catch {/* fall through to DB */}
    }

    // L2: DB
    const giveaway = await prisma.giveaways.findFirst({ where: { messageId, tenantId } });
    if (giveaway) {
      const ttl = giveaway.endTime
        ? Math.max(60, Math.floor((giveaway.endTime.getTime() - Date.now()) / 1000) + 300)
        : 300;
      await RedisService.set(
        this.metaKey(tenantId, messageId),
        JSON.stringify({ ...giveaway, endTime: giveaway.endTime?.toISOString() }),
        Math.min(ttl, GIVEAWAY_META_TTL)
      );
    }
    return giveaway;
  }

  /**
   * Fetches all active giveaways from DB — used only for worker boot recovery.
   */
  static async getActiveGiveaways() {
    return await prisma.giveaways.findMany({
      where: { ended: false },
    });
  }

  /**
   * Fetches active giveaways for a specific guild — used for admin autocomplete.
   */
  static async getActiveGiveawaysByGuild(tenantId: string, guildId: string) {
    return await prisma.giveaways.findMany({
      where: { tenantId, guildId, ended: false },
    });
  }

  static async getGiveawaysByGuild(tenantId: string, guildId: string) {
    return await prisma.giveaways.findMany({
      where: { tenantId, guildId },
      orderBy: { id: 'desc' }
    });
  }

  // ─── Mark Ended ──────────────────────────────────────────────────────────────
  static async markEnded(tenantId: string, messageId: string) {
    // Invalidate Redis meta cache
    await RedisService.del(this.metaKey(tenantId, messageId));
    // Remove from sorted-set scheduler
    await RedisService.zrem(this.scheduleKey(), `${tenantId}:${messageId}`);

    return await prisma.giveaways.updateMany({
      where: { messageId, tenantId },
      data: { ended: true },
    });
  }

  // ─── Redis Entry Ops (flush-on-end model) ────────────────────────────────────
  /**
   * Add a user to the Redis entry set — O(1).
   * Returns true if added (false = already present).
   */
  static async addEntry(giveawayId: number, userId: string): Promise<boolean> {
    const added = await RedisService.sadd(this.entryKey(giveawayId), userId);
    return added === 1;
  }

  /**
   * Remove a user from the Redis entry set — O(1).
   */
  static async removeEntry(giveawayId: number, userId: string): Promise<void> {
    await RedisService.srem(this.entryKey(giveawayId), userId);
  }

  /**
   * Check if a user has entered — O(1).
   */
  static async hasEntered(giveawayId: number, userId: string): Promise<boolean> {
    return await RedisService.sismember(this.entryKey(giveawayId), userId);
  }

  /**
   * Get current entry count — O(1).
   */
  static async getEntryCount(giveawayId: number): Promise<number> {
    return await RedisService.scard(this.entryKey(giveawayId));
  }

  /**
   * Get all entry userIds from Redis — O(N).
   */
  static async getEntryPool(giveawayId: number): Promise<string[]> {
    return await RedisService.smembers(this.entryKey(giveawayId));
  }

  /**
   * Flush Redis entry set → DB in one batch insert, then clean up the key.
   * Called only when a giveaway ends.
   */
  static async flushEntriesToDb(tenantId: string, giveawayId: number): Promise<string[]> {
    const userIds = await this.getEntryPool(giveawayId);
    if (userIds.length > 0) {
      try {
        await prisma.giveaway_entries.createMany({
          data: userIds.map(userId => ({ giveawayId, userId, tenantId, createdAt: new Date() })),
          skipDuplicates: true,
        });
      } catch (err) {
        Logger.error(`Failed to flush giveaway entries for giveaway ${giveawayId}`, err);
      }
    }
    // Always clean up Redis key
    await RedisService.client.del(this.entryKey(giveawayId));
    return userIds;
  }

  /**
   * Read flushed entries from DB — used only by reroll (post-ended giveaway).
   */
  static async getDbEntries(tenantId: string, giveawayId: number): Promise<string[]> {
    const entries = await prisma.giveaway_entries.findMany({
      where: { giveawayId, tenantId },
      select: { userId: true }
    });
    return entries.map(e => e.userId);
  }
}
