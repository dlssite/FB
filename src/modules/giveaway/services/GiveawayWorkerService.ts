import { Client } from 'discord.js';
import { GiveawayRepository } from '../database/GiveawayRepository';
import { GiveawayService } from './GiveawayService';
import { RedisService } from '../../../services/RedisService';
import { Logger } from '../../../utils/logger';

export class GiveawayWorkerService {
  /**
   * Starts the background worker for giveaway scheduling.
   * 
   * Architecture: Redis Sorted Set (`giveaway:schedule`) replaces the old full DB scan.
   *   - Score  = Unix epoch seconds of endTime
   *   - Member = `<tenantId>:<messageId>`
   * 
   * On boot: recover active giveaways from DB and re-register any that aren't in the set.
   * On tick: ZRANGEBYSCORE 0 <now> → pick up all expired → endGiveaway → ZREM
   */
  static startWorker(client: Client) {
    Logger.info('Giveaway Worker (Redis Scheduler) started.', 'GiveawayWorker' as any);

    // Boot recovery — runs once after 5s startup delay
    setTimeout(async () => {
      await this.bootRecovery(client);
    }, 5000);

    // Tick every 30s — ZRANGEBYSCORE is O(log N + M), very cheap
    setInterval(async () => {
      const lock = await RedisService.acquireLock('lock:giveaway:worker', 28);
      if (lock) {
        await this.checkExpiredGiveaways(client);
      }
    }, 30000);
  }

  /**
   * On startup, scan DB for any active giveaways and re-register them into the
   * sorted set (in case Redis was restarted and the keys were lost).
   */
  static async bootRecovery(client: Client) {
    try {
      const activeGiveaways = await GiveawayRepository.getActiveGiveaways();
      const now = Math.floor(Date.now() / 1000);

      for (const giveaway of activeGiveaways) {
        if (giveaway.drop || !giveaway.endTime) continue;

        const endEpoch = Math.floor(giveaway.endTime.getTime() / 1000);
        const member = `${giveaway.tenantId}:${giveaway.messageId}`;

        if (endEpoch <= now) {
          // Already expired but not ended — process immediately
          Logger.info(`[GiveawayWorker] Boot recovery: ending expired giveaway ${giveaway.messageId}`);
          await GiveawayService.endGiveaway(client, giveaway.tenantId, giveaway.messageId, giveaway);
        } else {
          // Re-register in sorted set
          await RedisService.zadd(GiveawayRepository.scheduleKey(), endEpoch, member);
        }
      }

      Logger.info(`[GiveawayWorker] Boot recovery complete — ${activeGiveaways.length} giveaways processed.`);
    } catch (e: any) {
      Logger.error('Giveaway Worker boot recovery failed', e);
    }

    // Immediately run first tick after recovery
    await this.checkExpiredGiveaways(client);
  }

  /**
   * Checks for expired giveaways using Redis ZRANGEBYSCORE.
   * This is O(log N + M) where M is the number of expired giveaways — extremely fast.
   */
  static async checkExpiredGiveaways(client: Client) {
    try {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const expired = await RedisService.zrangebyscore(
        GiveawayRepository.scheduleKey(),
        0,
        nowEpoch
      );

      if (expired.length === 0) return;

      Logger.info(`[GiveawayWorker] Processing ${expired.length} expired giveaway(s)...`);

      for (const member of expired) {
        const [tenantId, messageId] = member.split(':');
        if (!tenantId || !messageId) {
          await RedisService.zrem(GiveawayRepository.scheduleKey(), member);
          continue;
        }

        // Remove from schedule first to prevent double-processing
        await RedisService.zrem(GiveawayRepository.scheduleKey(), member);

        await GiveawayService.endGiveaway(client, tenantId, messageId).catch(err => {
          Logger.error(`[GiveawayWorker] Failed to end giveaway ${messageId}:`, err);
        });
      }
    } catch (e: any) {
      Logger.error('Giveaway Worker tick failed', e);
    }
  }
}
