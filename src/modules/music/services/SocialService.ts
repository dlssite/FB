import { MusicService, MusicEvents } from './MusicService';
import { client } from '../../../core/FlamebornClient';
import { ContainerService, replyV2 } from '../../../utils/container';
import { Logger } from '../../../utils/logger';
import { RedisService } from '../../../services/RedisService';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export class SocialService {
  private static HYPE_KEY = 'music:hype';

  /**
   * Initializes social listeners.
   */
  static init() {
    MusicService.on(MusicEvents.QUEUE_END, async (data) => {
      const { tenantId, guildId } = data;
      const recommendation = MusicService.getPhantomRecommendation();
      
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      // Find a suitable text channel to send the recommendation
      const channel = guild.channels.cache.find(c => c.isTextBased()) as any;
      if (!channel) return;

      const container = ContainerService.create({
        title: '👻 Symphony | Phantom DJ',
        description: `The queue is empty, but the party doesn't have to stop! \n\n**Phantom DJ suggests:** \`${recommendation}\``,
        color: '#9B59B6',
        footer: true,
      });

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId(`music_play_rec:${recommendation}`).setLabel('Play This!').setStyle(ButtonStyle.Success)
        );

      await channel.send({ ...container, components: [row] });
    });

    Logger.loader('[MUSIC-SOCIAL] Listeners active.');
  }

  /**
   * Tracks hype and triggers visual/social rewards at thresholds.
   */
  static async trackHype(guildId: string, userId: string) {
    const key = `${this.HYPE_KEY}:${guildId}`;
    const hypeCount = await RedisService.incr(key);
    
    // Auto-expire hype after 5 minutes of inactivity
    await RedisService.expire(key, 300);

    if (hypeCount === 10) {
      await this.broadcastHype(guildId, '🔥 The vibes are heating up! Keep it going!');
    } else if (hypeCount === 25) {
      await this.broadcastHype(guildId, '✨ **UNSTOPPABLE VIBES!** The crowd is surfing! 🌊');
    }

    return hypeCount;
  }

  private static async broadcastHype(guildId: string, message: string) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const channel = guild?.channels.cache.find(c => c.isTextBased()) as any;
    if (channel) {
      await channel.send({ content: message });
    }
  }
}
