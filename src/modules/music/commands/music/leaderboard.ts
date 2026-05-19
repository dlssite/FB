import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('leaderboard')
       .setDescription('🏆 View the Hall of Melody (Top Listeners).'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;

    const topListeners = await prisma.music_user_stats.findMany({
      where: { tenantId, guildId },
      orderBy: { totalListenTime: 'desc' },
      take: 10
    });

    const fields = topListeners.map((stats, i) => ({
      name: `${i + 1}. <@${stats.userId}>`,
      value: `⏱️ **${(Number(stats.totalListenTime) / 3600).toFixed(1)}h** | 🔥 **${stats.xpEarned} XP**`,
      inline: false
    }));

    const container = ContainerService.create({
      title: '🏆 Symphony | Hall of Melody',
      description: 'The most dedicated listeners in the server.',
      color: '#F1C40F',
      fields: fields.length > 0 ? fields : [{ name: 'No Stats Yet', value: 'Be the first to start the party!' }],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
