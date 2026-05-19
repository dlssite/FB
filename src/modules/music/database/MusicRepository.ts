import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';

export class MusicRepository {
  /**
   * Fetches music settings for a guild, with Redis caching.
   */
  static async getSettings(tenantId: string, guildId: string) {
    const cacheKey = `settings:music:${tenantId}:${guildId}`;
    
    // 1. Check Cache
    const cached = await RedisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 2. Fetch from DB
    const settings = await prisma.music_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: {},
      create: { guildId, tenantId }
    });

    // 3. Save to Redis (5 min TTL)
    await RedisService.set(cacheKey, JSON.stringify(settings), 300);
    return settings;
  }

  /**
   * Updates music settings and invalidates cache.
   */
  static async updateSettings(tenantId: string, guildId: string, data: any) {
    const result = await prisma.music_settings.update({
      where: { guildId_tenantId: { guildId, tenantId } },
      data
    });

    // Clear Cache
    await RedisService.del(`settings:music:${tenantId}:${guildId}`);
    return result;
  }

  /**
   * Fetches or creates user music stats.
   */
  static async getUserStats(tenantId: string, guildId: string, userId: string) {
    return await prisma.music_user_stats.upsert({
      where: { userId_guildId_tenantId: { userId, guildId, tenantId } },
      update: {},
      create: { userId, guildId, tenantId }
    });
  }

  /**
   * Updates user listening stats.
   */
  static async addListenTime(tenantId: string, guildId: string, userId: string, seconds: number, xp: number) {
    return await prisma.music_user_stats.upsert({
      where: { userId_guildId_tenantId: { userId, guildId, tenantId } },
      update: {
        totalListenTime: { increment: seconds },
        xpEarned: { increment: xp }
      },
      create: {
        userId, guildId, tenantId,
        totalListenTime: seconds,
        xpEarned: xp
      }
    });
  }

  /**
   * Increments track request count for a user.
   */
  static async incrementRequests(tenantId: string, guildId: string, userId: string) {
    return await prisma.music_user_stats.upsert({
      where: { userId_guildId_tenantId: { userId, guildId, tenantId } },
      update: { tracksRequested: { increment: 1 } },
      create: { userId, guildId, tenantId, tracksRequested: 1 }
    });
  }

  /**
   * Creates a new playlist.
   */
  static async createPlaylist(tenantId: string, guildId: string, userId: string, name: string, tracks: any[]) {
    return await prisma.music_playlists.create({
      data: {
        tenantId,
        guildId,
        userId,
        name,
        tracks
      }
    });
  }

  /**
   * Fetches all playlists for a user.
   */
  static async getPlaylists(tenantId: string, userId: string) {
    return await prisma.music_playlists.findMany({
      where: { tenantId, userId }
    });
  }

  /**
   * Fetches a specific playlist.
   */
  static async getPlaylist(id: string) {
    return await prisma.music_playlists.findUnique({
      where: { id }
    });
  }

  /**
   * Adds a track to user favorites.
   */
  static async addFavorite(tenantId: string, userId: string, track: any) {
    return await prisma.favorites.upsert({
      where: {
        userId_identifier_tenantId: {
          userId,
          tenantId,
          identifier: track.info?.identifier || track.identifier || track.title
        }
      },
      update: {},
      create: {
        tenantId,
        userId,
        identifier: track.info?.identifier || track.identifier || track.title,
        title: track.info?.title || track.title,
        author: track.info?.author || track.author || 'Unknown',
        length: BigInt(track.info?.length || track.length || 0),
        uri: track.info?.uri || track.uri || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Fetches all favorites for a user.
   */
  static async getFavorites(tenantId: string, userId: string) {
    return await prisma.favorites.findMany({
      where: { tenantId, userId }
    });
  }

  /**
   * Toggles the jukebox lock status.
   */
  static async toggleJukebox(tenantId: string, guildId: string, isLocked: boolean) {
    const result = await this.updateSettings(tenantId, guildId, { isLocked });
    return result;
  }
}
