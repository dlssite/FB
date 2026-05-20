import { Events, Interaction, InteractionResponse } from 'discord.js';
import { ContainerService, replyV2 } from '../../../utils/container';
import { tenantStorage } from '../../../utils/context';
import { LevelingService } from '../../leveling/services/LevelingService';
import { Logger } from '../../../utils/logger';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const guildId = interaction.guildId;
    if (!guildId) return;

    const { RoutingService } = await import('../../../services/RoutingService');
    const tenantId = await RoutingService.resolveTenantId(guildId, 'music');

    await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
      const userId = interaction.user.id;

    // --- TRIVIA HANDLER ---
    if (interaction.customId.startsWith('trivia_')) {
      const isCorrect = interaction.customId === 'trivia_correct';
      
      if (isCorrect) {
        await LevelingService.addExperience(tenantId, guildId, userId, 250);
        return await replyV2(interaction, ContainerService.create({
          title: '✅ Correct Answer!',
          description: `Awesome knowledge, <@${userId}>! You earned **250 XP**.`,
          color: '#2ECC71',
          interaction
        }));
      } else {
        return await replyV2(interaction, ContainerService.create({
          title: '❌ Wrong Answer',
          description: 'That was not the correct artist. Better luck next time!',
          color: '#E74C3C',
          interaction
        }));
      }
    }

    // --- NAVIGATION HANDLERS ---
    if (interaction.customId === 'music_prev') {
      const { MusicService } = await import('../services/MusicService');
      const member = interaction.member as any;
      if (!member.voice.channelId) return interaction.reply({ content: '❌ You must be in a voice channel!', flags: [64] });
      
      const result = await MusicService.previous(tenantId, guildId, userId, member.voice.channelId);
      if (result.success) {
        return await replyV2(interaction, ContainerService.create({
          title: '⏮️ Navigation | Previous',
          description: 'Successfully reverted to the previous track.',
          color: '#3498DB',
          interaction
        }), true);
      } else {
        return await replyV2(interaction, ContainerService.create({
          title: '❌ Navigation Failed',
          description: result.message || 'No history available.',
          color: '#E74C3C',
          interaction
        }), true);
      }
    }

    if (interaction.customId === 'music_next' || interaction.customId === 'music_skip') {
      const { MusicService } = await import('../services/MusicService');
      await MusicService.skip(tenantId, guildId, userId);
      return await replyV2(interaction, ContainerService.create({
        title: '⏭️ Navigation | Skip',
        description: 'Successfully skipped to the next track.',
        color: '#3498DB',
        interaction
      }), true);
    }

    if (interaction.customId === 'music_pause') {
      const { getLavalink } = await import('../services/LavalinkManager');
      const lava = getLavalink();
      const player = lava?.players.get(guildId) as any;
      if (player) {
        const isPaused = !player.paused;
        await player.setPaused(isPaused);
        return await replyV2(interaction, ContainerService.create({
          title: isPaused ? '⏸️ Symphony | Paused' : '▶️ Symphony | Resumed',
          description: `Playback has been ${isPaused ? 'paused' : 'resumed'}.`,
          color: '#3498DB',
          interaction
        }), true);
      }
      return await (interaction as any).deferUpdate();
    }

    if (interaction.customId === 'music_stop') {
      const { getLavalink } = await import('../services/LavalinkManager');
      const lava = getLavalink();
      await (lava as any).leaveVoiceChannel(guildId);
      return await replyV2(interaction, ContainerService.create({
        title: '⏹️ Symphony | Stopped',
        description: 'Playback stopped and disconnected from voice.',
        color: '#E74C3C',
        interaction
      }), true);
    }

    // --- DROPDOWN HANDLER ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'music_actions') {
      const value = interaction.values[0];
      
      if (value === 'hype') {
        // Reuse hype logic
        const { SocialService } = await import('../services/SocialService');
        const hypeCount = await SocialService.trackHype(guildId, userId);
        await LevelingService.addExperience(tenantId, guildId, userId, 10);
        
        return await replyV2(interaction, ContainerService.create({
          title: '🙌 Crowd Surfing!',
          description: `<@${userId}> is hyping up the crowd! (Hype Level: **${hypeCount}**)`,
          color: '#E67E22',
          interaction
        }), true);
      }

      if (value === 'lyrics') {
        return await replyV2(interaction, ContainerService.create({
          title: '📜 Symphony | Lyrics',
          description: '*Searching for lyrics... (Feature coming soon)*',
          color: '#3498DB',
          interaction
        }), true);
      }

      if (value === 'save') {
        const { getLavalink } = await import('../services/LavalinkManager');
        const { MusicRepository } = await import('../database/MusicRepository');
        
        const lava = getLavalink();
        const player = lava?.players.get(guildId) as any;
        const track = player?.track;

        if (!track) {
          return await replyV2(interaction, ContainerService.create({
            title: '❌ Save Failed',
            description: 'No music is currently playing to save!',
            color: '#E74C3C',
            interaction
          }), true);
        }

        try {
          await MusicRepository.addFavorite(tenantId, userId, track);
          return await replyV2(interaction, ContainerService.create({
            title: '💾 Symphony | Saved',
            description: `Successfully added **${track.info?.title || 'this track'}** to your favorites!`,
            color: '#2ECC71',
            interaction
          }), true);
        } catch (err) {
          Logger.error(`[Music] Failed to save favorite`, err);
          return await replyV2(interaction, ContainerService.create({
            title: '❌ Save Failed',
            description: 'An error occurred while saving to your playlist.',
            color: '#E74C3C',
            interaction
          }), true);
        }
      }

      return await (interaction as any).deferUpdate();
    }
  });
}
};
