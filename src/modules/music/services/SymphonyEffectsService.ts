import { RedisService } from '../../../services/RedisService';
import { Logger } from '../../../utils/logger';

export class SymphonyEffectsService {
  private static GOLDEN_HOUR_KEY = 'music:golden_hour';

  /**
   * Activates Golden Hour for a specific guild for 1 hour.
   */
  static async activateGoldenHour(guildId: string) {
    const duration = 3600; // 1 hour
    await RedisService.set(`${this.GOLDEN_HOUR_KEY}:${guildId}`, 'active', duration);
    Logger.info(`[Symphony-Effects] GOLDEN HOUR activated in ${guildId}`, 'SymphonyEffects' as any);
  }

  /**
   * Checks if Golden Hour is currently active.
   */
  static async isGoldenHour(guildId: string): Promise<boolean> {
    const active = await RedisService.get(`${this.GOLDEN_HOUR_KEY}:${guildId}`);
    return active === 'active';
  }
}
