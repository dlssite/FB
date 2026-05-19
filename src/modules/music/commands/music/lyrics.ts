import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Client } from 'genius-lyrics';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('lyrics')
       .setDescription('📜 View synced lyrics for the currently playing or searched track.')
       .addStringOption(opt => opt.setName('query').setDescription('Song name to search (optional)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const query = interaction.options.getString('query');
    const searchQuery = query || 'Bohemian Rhapsody Queen'; // default if queue is empty

    const token = flamebornConfig.music.geniusToken;
    if (!token) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Lyrics Unavailable',
        description: 'The Genius API token is not configured. Add `GENIUS_TOKEN` to your `.env` file.',
        color: '#E74C3C',
        interaction
      }));
    }

    const genius = new Client(token);

    const searches = await genius.songs.search(searchQuery).catch(() => []);
    const song = searches[0];

    if (!song) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Song Not Found',
        description: `Could not find lyrics for **${searchQuery}**.`,
        color: '#E74C3C',
        interaction
      }));
    }

    const lyrics = await song.lyrics().catch(() => null);
    const truncated = lyrics ? lyrics.slice(0, 800) + (lyrics.length > 800 ? '\n...' : '') : 'Lyrics unavailable.';

    const container = ContainerService.create({
      title: `📜 ${song.title}`,
      description: `**${song.artist.name}**\n\n\`\`\`\n${truncated}\n\`\`\``,
      color: '#9B59B6',
      thumbnail: song.thumbnail,
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
