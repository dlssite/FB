import { MusicUIHelper } from '../utils/MusicUIHelper';
import { getLavalink } from './LavalinkManager';
import { replyV2 } from '../../../utils/container';
import { Logger } from '../../../utils/logger';
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize, 
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder
} from 'discord.js';

export class MusicDisplayService {
  private static activeIntervals = new Map<string, NodeJS.Timeout>();
  private static activeMessages = new Map<string, any>(); // guildId -> interaction/message metadata

  /**
   * Registers an interaction for periodic updates.
   */
  static register(guildId: string, interaction: any, trackInfo: any, theme: any, userId: string) {
    this.stop(guildId);

    this.activeMessages.set(guildId, { interaction, trackInfo, theme, userId });

    const interval = setInterval(async () => {
      await this.update(guildId).catch(() => {});
    }, 10000); // 10 seconds to avoid rate limits

    this.activeIntervals.set(guildId, interval);
  }

  /**
   * Stops periodic updates for a guild.
   */
  static stop(guildId: string) {
    if (this.activeIntervals.has(guildId)) {
      clearInterval(this.activeIntervals.get(guildId)!);
      this.activeIntervals.delete(guildId);
    }
    this.activeMessages.delete(guildId);
  }

  /**
   * Performs a single update of the music embed.
   */
  static async update(guildId: string) {
    const data = this.activeMessages.get(guildId);
    if (!data) return;

    const { interaction, trackInfo, theme, userId } = data;
    const lava = getLavalink();
    const player = lava?.players.get(guildId) as any;

    // If player is missing or idle, wait a few pulses before stopping
    // to allow for track transitions.
    if (!player || (!player.track && !player.paused)) {
      const lastCheck = data.lastCheckTime || 0;
      if (Date.now() - lastCheck > 5000) {
        this.stop(guildId);
        return;
      }
    } else {
      data.lastCheckTime = Date.now();
      this.activeMessages.set(guildId, data);
    }

    const currentPos = player.position || 0;
    const totalPos = trackInfo.length || 0;
    const timelapse = `\`${MusicUIHelper.formatDuration(currentPos)}\` / \`${MusicUIHelper.formatDuration(totalPos)}\``;

    const navRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId('music_prev').setLabel('⏮️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_pause').setLabel('⏯️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_next').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_stop').setLabel('⏹️').setStyle(ButtonStyle.Danger)
      );

    const actionMenu = new StringSelectMenuBuilder()
      .setCustomId('music_actions')
      .setPlaceholder('Symphony Actions...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Crowd Surf')
          .setDescription('Hype up the track!')
          .setValue('hype')
          .setEmoji('🙌'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Lyrics')
          .setDescription('View song lyrics')
          .setValue('lyrics')
          .setEmoji('📜'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Add to Playlist')
          .setDescription('Save this track to your favorites')
          .setValue('save')
          .setEmoji('💾')
      );

    const menuRow = new ActionRowBuilder<any>().addComponents(actionMenu);

    const container = new ContainerBuilder()
      .setAccentColor(theme.color.startsWith('#') ? parseInt(theme.color.replace('#', ''), 16) : 0x000000);

    // 1. Header
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎶 Symphony | Now Playing`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 3. Info
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Currently playing: **${trackInfo.title}**`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 5. Image
    if (trackInfo.artworkUrl || trackInfo.thumbnail || theme.banner) {
      container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(trackInfo.artworkUrl || trackInfo.thumbnail || theme.banner)
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 7. Artist and Duration
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `👤 **Artist:** \`${trackInfo.author || 'Unknown'}\` \n⏳ **Duration:** ${timelapse}` 
    ));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 9. Buttons
    container.addActionRowComponents(navRow);
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 11. Dropdown
    container.addActionRowComponents(menuRow);
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 13. Footer (Default Style)
    const { client } = await import('../../../core/FlamebornClient');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `*${client.user?.username || 'Saphy'} • ${new Date().toLocaleTimeString()} • Req by <@${userId}>*` 
    ));

    // Use replyV2 to update the message via REST
    try {
      await replyV2(interaction, { components: [container] });
    } catch (err: any) {
      Logger.error(`[Music-Display] Update failed for ${guildId}. Error: ${err?.message || 'Unknown'}`, err);
      // Only stop if it's a fatal interaction error
      if (err?.message?.includes('Unknown Interaction') || err?.message?.includes('expired')) {
        this.stop(guildId);
      }
    }
  }

  /**
   * Updates the track info for an active message.
   */
  static updateTrack(guildId: string, track: any) {
    Logger.info(`[Music-Display] Updating track for ${guildId}: ${track?.title}`, 'MusicDisplayService' as any);
    const data = this.activeMessages.get(guildId);
    if (data) {
      data.trackInfo = track;
      data.lastCheckTime = Date.now();
      this.activeMessages.set(guildId, data);
      this.update(guildId).catch(err => {
        Logger.error(`[Music-Display] updateTrack trigger failed`, err);
      });
    } else {
      Logger.warn(`[Music-Display] updateTrack called for ${guildId} but no active message found.`);
    }
  }
}
