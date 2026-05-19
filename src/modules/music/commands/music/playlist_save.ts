import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { MusicRepository } from '../../database/MusicRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('playlist_save')
       .setDescription('💾 Save the current queue as a personal playlist.')
       .addStringOption(opt => opt.setName('name').setDescription('Name for your playlist').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const name = interaction.options.getString('name', true);
    const userId = interaction.user.id;

    // Mock tracks from queue
    const tracks = ['Believer', 'Blinding Lights', 'Levitating'];

    const playlist = await MusicRepository.createPlaylist(tenantId, guildId, userId, name, tracks);

    const container = ContainerService.create({
      title: '💾 Symphony | Playlist Saved',
      description: `Your playlist **${name}** has been saved to the Vault.`,
      color: '#1ABC9C',
      fields: [
        { name: 'ID', value: `\`${playlist.id}\`` },
        { name: 'Tracks', value: `\`${tracks.length}\`` }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
