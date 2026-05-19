import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { MusicRepository } from '../../database/MusicRepository';
import { MusicService } from '../../services/MusicService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('playlist_load')
       .setDescription('📂 Load a saved playlist into the queue.')
       .addStringOption(opt => opt.setName('id').setDescription('The ID of the playlist to load').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const playlistId = interaction.options.getString('id', true);
    const userId = interaction.user.id;

    const playlist = await MusicRepository.getPlaylist(playlistId);

    if (!playlist || playlist.tenantId !== tenantId) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Playlist Not Found',
        description: `Could not find a playlist with ID \`${playlistId}\`.`,
        color: '#E74C3C',
        interaction
      }));
    }

    const tracks = playlist.tracks as string[];
    for (const track of tracks) {
      await MusicService.play(tenantId, guildId, userId, track);
    }

    const container = ContainerService.create({
      title: '📂 Symphony | Playlist Loaded',
      description: `Successfully loaded **${playlist.name}** with **${tracks.length}** tracks.`,
      color: '#2ECC71',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
