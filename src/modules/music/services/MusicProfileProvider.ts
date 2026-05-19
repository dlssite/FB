import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { prisma } from '../../../database/client';

export class MusicProfileProvider implements ProfileProvider {
  moduleName = 'music';
  priority = 90; // Appears after invite

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [];

    const [stats, allStats] = await Promise.all([
      prisma.music_user_stats.findUnique({
        where: {
          userId_guildId_tenantId: { userId, guildId, tenantId }
        }
      }),
      prisma.music_user_stats.findMany({
        where: { guildId, tenantId, totalListenTime: { gt: 0 } },
        orderBy: { totalListenTime: 'desc' }
      })
    ]);

    if (!stats) return [
      {
        name: '🎶 Symphony Listening Record',
        value: '**Listen Time:** *0 hrs* (*0 mins*)\n**Tracks Requested:** *0*\n**Music XP:** *0*',
        inline: true
      }
    ];

    const listenMinutes = Math.floor(Number(stats.totalListenTime || 0) / 60);
    const listenHours = (listenMinutes / 60).toFixed(1);

    const rankIndex = allStats.findIndex(s => s.userId === userId);
    const rank = rankIndex >= 0 ? rankIndex + 1 : 0;

    return [
      {
        name: `🎶 Symphony Listening Record | Rank: \`#${rank > 0 ? rank : 'N/A'}\` ${rank === 1 ? '👑 (Top Maestro)' : ''}`,
        value: `**Listen Time:** \`${listenHours} hrs\` (\`${listenMinutes} mins\`)\n**Tracks Requested:** \`${stats.tracksRequested}\`\n**Music XP:** \`${stats.xpEarned}\``,
        inline: true
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const stats = await prisma.music_user_stats.findUnique({
      where: {
        userId_guildId_tenantId: { userId, guildId, tenantId }
      }
    });

    if (!stats) return { hasMusicStats: false };

    return {
      hasMusicStats: true,
      totalListenTimeSeconds: Number(stats.totalListenTime || 0),
      tracksRequested: stats.tracksRequested,
      xpEarned: Number(stats.xpEarned || 0)
    };
  }
}
