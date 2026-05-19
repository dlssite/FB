import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MusicService } from '../../services/MusicService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { MusicRepository } from '../../database/MusicRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('play')
       .setDescription('🎶 Add a song to the queue and start playing.')
       .addStringOption(opt => 
         opt.setName('query')
            .setDescription('The song title, URL, or artist')
            .setRequired(true)
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const query = interaction.options.getString('query', true);
    const userId = interaction.user.id;

    // --- LIVEDJ CHECK ---
    const { LiveDJService } = await import('../../services/LiveDJService');
    const activeDJ = await LiveDJService.getActiveDJ(guildId);
    if (activeDJ && activeDJ !== userId) {
      return await replyV2(interaction, ContainerService.create({
        title: '🎧 LiveDJ Session Active',
        description: `There is an active LiveDJ session hosted by <@${activeDJ}>. Only the DJ can add tracks right now!`,
        color: '#E91E63',
        interaction
      }));
    }

    // Fetch settings to check for Jukebox Lock
    const settings = await MusicRepository.getSettings(tenantId, guildId);
    
    const { SymphonyEffectsService } = await import('../../services/SymphonyEffectsService');
    const isGoldenHour = await SymphonyEffectsService.isGoldenHour(guildId);

    if (settings.isLocked && !isGoldenHour) {
      const { EconomyRepository } = await import('../../../economy/database/EconomyRepository');
      const inventory = await EconomyRepository.getInventory(tenantId, userId);
      const token = inventory.find(i => i.itemName === 'jukebox_token' && i.quantity > 0);

      if (!token) {
        // Fallback: Charge 100 Embers if no token
        const user = await EconomyRepository.getUser(tenantId, userId);
        if (!user || Number(user.embers || 0) < 100) {
          return await replyV2(interaction, ContainerService.create({
            title: '🔐 Jukebox Locked',
            description: 'This channel is in Jukebox mode. You need a **Jukebox Token** or **100 Embers** to request a song.',
            color: '#E74C3C',
            interaction
          }));
        }
        await EconomyRepository.updateBalance(tenantId, userId, { embers: -100 });
      } else {
        await EconomyRepository.updateItemQuantity(tenantId, userId, 'jukebox_token', -1);
      }
    }

    // Check for voice channel
    const member = interaction.member as any;
    if (!member.voice.channelId) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Voice Connection Required',
        description: 'You must be in a voice channel to use the Symphony Music Engine.',
        color: '#E74C3C',
        interaction
      }));
    }

    const voiceChannelId = member.voice.channelId;
    const result = await MusicService.play(tenantId, guildId, userId, query, voiceChannelId);
    
    if (!result.success) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Search Failed',
        description: result.message || `No results found for **${query}**.`,
        color: '#E74C3C',
        interaction
      }));
    }

    // Increment requests in DB
    await MusicRepository.incrementRequests(tenantId, guildId, userId);

    // ECOSYSTEM RESISTANCE: Genre Theming
    const { EffectManager } = await import('../../services/EffectManager');
    // Mock genre detection from query
    let genre = 'default';
    if (query.toLowerCase().includes('rock')) genre = 'rock';
    if (query.toLowerCase().includes('jazz')) genre = 'jazz';
    if (query.toLowerCase().includes('lofi')) genre = 'lofi';
    
    const theme = EffectManager.getPlayerTheme(genre);
    const track = result.track;

    const { MusicUIHelper } = await import('../../utils/MusicUIHelper');
    const { getLavalink } = await import('../../services/LavalinkManager');
    const lava = getLavalink();
    const player = lava?.players.get(guildId) as any;
    
    const currentPos = player?.position || 0;
    const totalPos = track.length || 0;
    const timelapse = `\`${MusicUIHelper.formatDuration(currentPos)}\` / \`${MusicUIHelper.formatDuration(totalPos)}\``;

    const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SeparatorBuilder, SeparatorSpacingSize } = await import('discord.js');

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

    const isQueued = (result as any).queued === true;

    if (isQueued) {
      return await replyV2(interaction, ContainerService.create({
        title: '📥 Symphony | Added to Queue',
        description: `Successfully added **${track.title}** to the sequence.\n👤 **Artist:** \`${track.author || 'Unknown'}\` | ⏳ **Length:** \`${MusicUIHelper.formatDuration(track.length)}\``,
        color: '#F39C12',
        interaction
      }), true);
    }

    // Build the full player container manually for the active track
    const { ContainerBuilder, TextDisplayBuilder } = await import('discord.js');
    const container = new ContainerBuilder()
      .setAccentColor(theme.color.startsWith('#') ? parseInt(theme.color.replace('#', ''), 16) : 0x000000);

    // 1. Header
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 🎶 Symphony | Now Playing`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 3. Info
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Now playing **${track.title}**.`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 5. Image
    if (track.artworkUrl || track.thumbnail || theme.banner) {
      const { MediaGalleryBuilder, MediaGalleryItemBuilder } = await import('discord.js');
      container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(track.artworkUrl || track.thumbnail || theme.banner)
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 7. Artist and Duration
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `👤 **Artist:** \`${track.author || 'Unknown'}\` \n⏳ **Duration:** ${timelapse}` 
    ));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 9. Buttons
    container.addActionRowComponents(navRow);
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 11. Dropdown
    container.addActionRowComponents(menuRow);
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 13. Footer (Default Style)
    const { client: flameClient } = await import('../../../../core/FlamebornClient');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `*${flameClient.user?.username || 'Saphy'} • ${new Date().toLocaleTimeString()} • Req by <@${userId}>*` 
    ));

    await replyV2(interaction, { components: [container] });

    // Register for periodic updates
    const { MusicDisplayService } = await import('../../services/MusicDisplayService');
    MusicDisplayService.register(guildId, interaction, track, theme, userId);
  }
};
