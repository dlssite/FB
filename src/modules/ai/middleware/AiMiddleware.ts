import { flamebornConfig } from '../../../config/flameborn.config';
import { RedisService } from '../../../services/RedisService';

export class AiMiddleware {
  static async acquireLock(channelId: string): Promise<boolean> {
    const lockKey = `ai:lock:${channelId}`;
    return RedisService.acquireLock(lockKey, 10); // 10 seconds lock
  }

  static async releaseLock(channelId: string): Promise<void> {
    const lockKey = `ai:lock:${channelId}`;
    await RedisService.releaseLock(lockKey);
  }

  static async shouldEngage(channelId: string, isMention: boolean, isBusyChannel: boolean): Promise<boolean> {
    if (isMention) return true; // Always engage on direct mention

    const { engagementCds } = flamebornConfig.ai;
    const cooldown = isBusyChannel ? engagementCds.busyChannel : engagementCds.slowChannel;
    
    const cdKey = `ai:cd:${channelId}`;
    const isOnCooldown = await RedisService.get(cdKey);
    
    if (isOnCooldown) {
      return false; // Skip if on cooldown
    }
    
    // Set cooldown
    await RedisService.set(cdKey, 'active', cooldown);
    return true;
  }
}
