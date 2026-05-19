import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { MusicRepository } from '../../database/MusicRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('playlist_list')
       .setDescription('📂 List all your saved playlists.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId } = context;
    const userId = interaction.user.id;

    const playlists = await MusicRepository.getPlaylists(tenantId, userId);

    const fields = playlists.map(pl => ({
      name: `🎵 ${pl.name}`,
      value: `ID: \`${pl.id}\` | Tracks: \`${(pl.tracks as any[]).length}\``,
      inline: false
    }));

    const container = ContainerService.create({
      title: '📂 Symphony | Your Vault',
      description: playlists.length > 0 ? 'Here are your saved playlists:' : 'Your vault is currently empty.',
      color: '#34495E',
      fields: fields.slice(0, 10),
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
