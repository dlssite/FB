import { VoiceState } from 'discord.js';
import { ActivityService } from '../services/ActivityService';
import { RoutingService } from '../../../services/RoutingService';
import { RedisService } from '../../../services/RedisService';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState: VoiceState, newState: VoiceState) {
    // Avoid tracking bots
    if (oldState.member?.user.bot || newState.member?.user.bot) return;

    try {
      const guildId = oldState.guild.id || newState.guild.id;
      const userId = oldState.member?.id || newState.member?.id;
      if (!guildId || !userId) return;

      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');
      const startKey = `activity:voice:start:${tenantId}:${guildId}:${userId}`;

      const joined = !oldState.channelId && newState.channelId;
      const left = oldState.channelId && !newState.channelId;

      if (joined) {
        // Log voice join timestamp
        await RedisService.set(startKey, Date.now().toString(), 86400); // 24-hour max safety timeout
      } else if (left) {
        // Calculate voice session duration
        const startTimeStr = await RedisService.get(startKey);
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr, 10);
          const durationSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          
          if (durationSeconds > 0) {
            await ActivityService.logVoiceActivity(tenantId, guildId, userId, durationSeconds);
          }
        }
        await RedisService.del(startKey);
      }

    } catch (err) {
      console.error('[ACTIVITY VOICE TELEMETRY ERROR]', err);
    }
  }
};
