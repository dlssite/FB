import { RedisService } from '../../../services/RedisService';
import { Logger } from '../../../utils/logger';
import { ContainerService, sendV2 } from '../../../utils/container';
import { client } from '../../../core/FlamebornClient';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';

export class LiveDJService {
  private static DJ_SESSION_KEY = 'music:livedj:session';

  /**
   * Starts a LiveDJ session for a user in a guild.
   */
  static async startSession(tenantId: string, guildId: string, userId: string, channelId: string) {
    const key = `${this.DJ_SESSION_KEY}:${guildId}`;
    
    // Set a 2-hour expiration for the DJ session
    await RedisService.set(key, userId, 7200);
    Logger.info(`[Music-Social] LiveDJ Session started by ${userId} in guild ${guildId}`, 'LiveDJService' as any);

    await this.spawnDJPanel(tenantId, guildId, userId, channelId);
    return { success: true };
  }

  /**
   * Ends an active LiveDJ session.
   */
  static async endSession(guildId: string, userId: string) {
    const key = `${this.DJ_SESSION_KEY}:${guildId}`;
    const currentDJ = await RedisService.get(key);

    if (currentDJ === userId) {
      await RedisService.del(key);
      Logger.info(`[Music-Social] LiveDJ Session ended by ${userId} in guild ${guildId}`, 'LiveDJService' as any);
      return { success: true };
    }

    return { success: false, message: 'You are not the active LiveDJ.' };
  }

  /**
   * Gets the active DJ for a guild, if any.
   */
  static async getActiveDJ(guildId: string): Promise<string | null> {
    const key = `${this.DJ_SESSION_KEY}:${guildId}`;
    return await RedisService.get(key);
  }

  /**
   * Spawns the exclusive LiveDJ control panel.
   */
  private static async spawnDJPanel(tenantId: string, guildId: string, userId: string, channelId: string) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const channel = await guild?.channels.fetch(channelId).catch(() => null) as TextChannel | undefined;

    if (!channel || !channel.isTextBased()) return;

    const container = ContainerService.create({
      title: '🎧 Symphony | LiveDJ Session Active',
      description: `<@${userId}> is now hosting a LiveDJ Session!\n\nOnly the LiveDJ can control the queue and skip tracks while this session is active. Drop your song requests in the chat and the DJ might add them!`,
      color: '#E91E63', // A distinct color for DJ mode
      footer: true,
      fields: [
        { name: 'DJ', value: `<@${userId}>` },
        { name: 'Status', value: '🟢 LIVE' },
      ],
      image: 'https://placehold.co/800x400.png?text=LIVEDJ+SESSION'
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId(`livedj_end`).setLabel('End Session').setStyle(ButtonStyle.Danger)
      );

    await sendV2(channel, { ...container, components: [row] });
  }
}
