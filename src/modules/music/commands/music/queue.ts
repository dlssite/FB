import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('queue')
       .setDescription('📜 View the current track and upcoming songs.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;

    const { MusicService } = await import('../../services/MusicService');
    const queue = MusicService.getQueue(guildId);

    const fields = queue.slice(0, 10).map((track, i) => ({
      name: `${i + 1}. ${track.title}`,
      value: `👤 **Artist:** \`${track.author}\` | ⏳ **Length:** \`${Math.floor(Number(track.length) / 60000)}m\``,
      inline: false
    }));

    const container = ContainerService.create({
      title: '📜 Symphony | Current Queue',
      description: 'Showing the next 10 tracks in the sequence.',
      color: '#F39C12',
      fields: fields.length > 0 ? fields : [{ name: 'Queue Empty', value: 'Use `/music play` to add some tracks!' }],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
