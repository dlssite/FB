import { MusicRepository } from '../database/MusicRepository';
import { LevelingService } from '../../leveling/services/LevelingService';
import { Logger } from '../../../utils/logger';

export class GamifyService {
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes the gamification heartbeat.
   */
  static init() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      try {
        const { getLavalink } = await import('./LavalinkManager');
        const { client } = await import('../../../core/FlamebornClient');
        const { RoutingService } = await import('../../../services/RoutingService');
        const { SymphonyEffectsService } = await import('./SymphonyEffectsService');

        const lava = getLavalink();
        if (!lava) return;

        for (const [guildId, player] of (lava.players as any)) {
          if (!player.track || player.paused) continue;

          const guild = await client.guilds.fetch(guildId).catch(() => null);
          if (!guild) continue;

          const botMember = await guild.members.fetch(client.user!.id).catch(() => null);
          const channelId = botMember?.voice.channelId;
          if (!channelId) continue;

          const vc = await guild.channels.fetch(channelId).catch(() => null) as any;
          if (!vc || !vc.members) continue;

          const listeners = vc.members.filter((m: any) => !m.user.bot);
          if (listeners.size === 0) continue;

          // Resolve tenant context
          const tenantId = await RoutingService.resolveTenantId(guildId, 'music');
          const isGoldenHour = await SymphonyEffectsService.isGoldenHour(guildId);
          
          let multiplier = isGoldenHour ? 3 : 1;
          if (listeners.size >= 5 && !isGoldenHour) multiplier = 2; // Vibe Combo

          const xpToGrant = Math.floor(10 * multiplier); // Base 10 XP per minute

          for (const [userId, member] of listeners) {
            await MusicRepository.addListenTime(tenantId, guildId, userId, 60, xpToGrant);
            await LevelingService.addExperience(tenantId, guildId, userId, xpToGrant);
          }
          
          if (multiplier > 1) {
            Logger.info(`[Music-Gamify] Heartbeat: Granted ${xpToGrant} XP to ${listeners.size} members in ${guildId} (${multiplier}x multiplier).`, 'GamifyService' as any);
          }
        }
      } catch (err) {
        Logger.error(`[Music-Gamify] Heartbeat error`, err);
      }
    }, 60000);

    Logger.loader('[MUSIC-GAMIFY] Heartbeat active (60s interval).');
  }

  static stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
