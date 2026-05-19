import { EventEmitter } from 'events';
import { Logger } from '../../../utils/logger';
import { flamebornConfig } from '../../../config/flameborn.config';
import { MusicDisplayService } from './MusicDisplayService';

export enum MusicEvents {
  TRACK_START = 'trackStart',
  TRACK_END = 'trackEnd',
  QUEUE_END = 'queueEnd',
  PLAYER_MOVE = 'playerMove',
  PLAYER_DISCONNECT = 'playerDisconnect',
  USER_JOIN_VC = 'userJoinVC'
}

export class MusicService {
  private static eventBus = new EventEmitter();

  // In-memory queue per guild: guildId -> array of track objects
  private static queues = new Map<string, any[]>();
  private static previousTracks = new Map<string, any[]>();

  static on(event: MusicEvents, listener: (...args: any[]) => void) {
    this.eventBus.on(event, listener);
  }

  static emit(event: MusicEvents, ...args: any[]) {
    this.eventBus.emit(event, ...args);
  }

  /**
   * Searches, queues and plays a track via Lavalink.
   */
  static async play(tenantId: string, guildId: string, userId: string, query: string, channelId?: string) {
    Logger.info(`[Music] Playing/Queueing "${query}" in guild ${guildId}`, 'MusicService' as any);

    const { searchTrack, getOrCreatePlayer } = await import('./LavalinkManager');
    const { client } = await import('../../../core/FlamebornClient');

    if (!channelId) return { success: false, message: 'You must be in a voice channel!' };

    try {
      const track = await searchTrack(query);
      if (!track) return { success: false, message: 'No track found for your query.' };

      const player = await getOrCreatePlayer(client, guildId, channelId, '');
      
      // Initialize events if not already done for this player
      if (!(player as any)._eventsInitialized) {
        (player as any)._eventsInitialized = true;
        (player as any).on('end', async () => {
          const queue = MusicService.queues.get(guildId) || [];
          if (queue.length > 0) {
            const nextTrack = queue.shift()!;
            MusicService.queues.set(guildId, queue);
            
            // Auto-play next
            await (player as any).playTrack({ track: { encoded: nextTrack.encoded } });
            
            // Update UI
            MusicDisplayService.updateTrack(guildId, nextTrack.info);

            MusicService.emit(MusicEvents.TRACK_START, {
              tenantId, guildId, userId,
              query: nextTrack.info?.title,
              author: nextTrack.info?.author,
              duration: nextTrack.info?.length,
              thumbnail: nextTrack.info?.artworkUrl || nextTrack.info?.thumbnail,
              player: player,
              timestamp: Date.now()
            });
          } else {
            MusicDisplayService.stop(guildId);
            this.emit(MusicEvents.QUEUE_END, { tenantId, guildId });
          }
        });
        (player as any)._eventsInitialized = true;
      }

      // If already playing, add to queue
      if (player.track) {
        const queue = MusicService.queues.get(guildId) || [];
        queue.push(track);
        MusicService.queues.set(guildId, queue);

        return { success: true, queued: true, track: track.info };
      }

      // Play immediately
      await (player as any).playTrack({ track: { encoded: track.encoded } });
      await (player as any).setGlobalVolume(100);
      await (player as any).setPaused(false);

      // Update UI if a player already exists for this guild
      MusicDisplayService.updateTrack(guildId, track.info);

      this.emit(MusicEvents.TRACK_START, {
        tenantId, guildId, userId,
        query: track.info?.title || query,
        author: track.info?.author,
        duration: track.info?.length,
        thumbnail: track.info?.artworkUrl || track.info?.thumbnail,
        player: player,
        timestamp: Date.now()
      });

      return { success: true, queued: false, track: track.info };

    } catch (err) {
      Logger.error(`[Music] Play/Queue failed`, err);
      return { success: false, message: 'An error occurred while processing the track.' };
    }
  }

  /**
   * Plays the previous track from history.
   */
  static async previous(tenantId: string, guildId: string, userId: string, channelId: string) {
    const history = this.previousTracks.get(guildId) || [];
    if (history.length === 0) return { success: false, message: 'No history found!' };

    const prev = history.pop()!;
    this.previousTracks.set(guildId, history);

    return await this.play(tenantId, guildId, userId, prev, channelId);
  }

  /**
   * Fetches the current queue for a guild.
   */
  static getQueue(guildId: string) {
    const queue = MusicService.queues.get(guildId) || [];
    return queue.map(t => ({
      title: t.info?.title || 'Unknown',
      author: t.info?.author || 'Unknown',
      length: t.info?.length || 0,
      uri: t.info?.uri || ''
    }));
  }

  /**
   * Skips the current track.
   */
  static async skip(tenantId: string, guildId: string, userId: string) {
    Logger.info(`[Music] Skip requested in guild ${guildId}`, 'MusicService' as any);

    const { getLavalink } = await import('./LavalinkManager');
    const lava = getLavalink();
    const player = lava?.players.get(guildId) as any;

    if (player) {
      await player.stopTrack();
    }

    this.emit(MusicEvents.TRACK_END, { tenantId, guildId, userId, reason: 'skipped' });

    const queue = this.queues.get(guildId) || [];
    if (queue.length === 0) {
      this.emit(MusicEvents.QUEUE_END, { tenantId, guildId });
    }

    return { success: true };
  }



  /**
   * Adds a track to the guild queue.
   */
  static enqueue(guildId: string, query: string) {
    const q = this.queues.get(guildId) || [];
    q.push(query);
    this.queues.set(guildId, q);
  }

  /**
   * Phantom DJ recommendation pool.
   */
  static getPhantomRecommendation() {
    const recommendations = [
      'Radiohead - Creep',
      'Queen - Bohemian Rhapsody',
      'The Beatles - Yesterday',
      'Fleetwood Mac - Dreams',
      'Daft Punk - Get Lucky',
      'Kendrick Lamar - HUMBLE.'
    ];
    return recommendations[Math.floor(Math.random() * recommendations.length)];
  }

  /**
   * Handles voice state changes — bot lifecycle and user join events.
   */
  static async handleVoiceUpdate(oldState: any, newState: any) {
    const tenantId = (oldState.client as any).tenantStorage?.getStore()?.tenantId || 'default';
    const guildId = oldState.guild.id;

    if (oldState.member.id === oldState.client.user.id) {
      if (!newState.channelId) {
        MusicDisplayService.stop(guildId);
        this.emit(MusicEvents.PLAYER_DISCONNECT, { guildId });
      } else if (oldState.channelId !== newState.channelId) {
        this.emit(MusicEvents.PLAYER_MOVE, { guildId, newChannelId: newState.channelId });
      }
      return;
    }

    if (!oldState.channelId && newState.channelId) {
      this.emit(MusicEvents.USER_JOIN_VC, {
        tenantId, guildId,
        userId: newState.member.id,
        channelId: newState.channelId
      });
    }
  }
}
