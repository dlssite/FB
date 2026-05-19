import { MusicService, MusicEvents } from './MusicService';
import { EffectManager } from './EffectManager';
import { Logger } from '../../../utils/logger';
import { prisma } from '../../../database/client';

/**
 * Manages Spatial Audio Presence by integrating with the TempVoice module.
 * Listens for USER_JOIN_VC events, checks if the channel is a tempvoice zone,
 * and applies appropriate audio filters (e.g., muffled in the Lobby, crisp on the Dance Floor).
 */
export class SpatialAudioService {
  // Zone name fragments -> audio filter names
  private static readonly ZONE_FILTER_MAP: Record<string, string> = {
    'lobby':       'muffled',
    'lounge':      'vaporwave',
    'chill':       'vaporwave',
    'dance':       'bass',
    'dance floor': 'bass',
    'vip':         'nightcore',
    'main':        'reset',
    'stage':       'reset',
  };

  static init() {
    MusicService.on(MusicEvents.USER_JOIN_VC, async (data) => {
      const { tenantId, guildId, userId, channelId } = data;
      await this.applySpatialFilter(tenantId, guildId, userId, channelId);
    });

    Logger.loader('[MUSIC-STUDIO] Spatial Audio Presence active.');
  }

  /**
   * Looks up the tempvoice session for the channel, determines the zone name,
   * and applies the matching audio filter.
   */
  private static async applySpatialFilter(tenantId: string, guildId: string, userId: string, channelId: string) {
    try {
      // Check if this channel is a managed tempvoice channel
      const session = await prisma.tempvoice_sessions.findUnique({
        where: { channelId }
      });

      if (!session) return; // Not a tempvoice channel — skip

      // Find the hub to get category name (zone classification)
      const hub = await prisma.tempvoice_hubs.findUnique({
        where: { id: session.hubId }
      });

      if (!hub) return;

      const hubNameLower = hub.hubName.toLowerCase();
      let matchedFilter = 'reset'; // Default: crisp, no filter

      for (const [zone, filter] of Object.entries(this.ZONE_FILTER_MAP)) {
        if (hubNameLower.includes(zone)) {
          matchedFilter = filter;
          break;
        }
      }

      if (matchedFilter !== 'reset') {
        await EffectManager.applyFilter(tenantId, guildId, matchedFilter);
        Logger.info(
          `[Spatial Audio] User ${userId} joined zone "${hub.hubName}" → Applied filter: "${matchedFilter}"`,
          'SpatialAudioService' as any
        );
      }
    } catch (err) {
      // Non-critical — log and continue
      Logger.warn(`[Spatial Audio] Could not apply filter: ${err}`);
    }
  }
}
