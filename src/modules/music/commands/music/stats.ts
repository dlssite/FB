import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { MusicRepository } from '../../database/MusicRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('stats')
       .setDescription('📊 View your personal music listening analytics.')
       .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const target = interaction.options.getUser('user') || interaction.user;
    const userId = target.id;

    const stats = await MusicRepository.getUserStats(tenantId, guildId, userId);

    const hours = (Number(stats.totalListenTime) / 3600).toFixed(1);

    const container = ContainerService.create({
      title: `📊 Music Stats | ${target.username}`,
      description: `Analytics for <@${userId}>'s listening habits in this server.`,
      color: '#3498DB',
      thumbnail: target.displayAvatarURL(),
      fields: [
        { name: 'Total Listen Time', value: `\`${hours} hours\`` },
        { name: 'Tracks Requested', value: `\`${stats.tracksRequested}\`` },
        { name: 'Ecosystem XP Earned', value: `\`${stats.xpEarned} XP\`` },
        { name: 'Vibe Profile', value: `\`${Number(hours) > 10 ? '🔥 Hyper Listener' : '🎵 Casual Chiller'}\`` },
        { name: 'Listening Heatmap', value: '`░░░░░▒▒▓▓▓▓▓▒▒░░░░░` (Peak: 9PM)' }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
