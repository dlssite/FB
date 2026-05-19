import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { PrismaClient } from '@prisma/client';
import { ActivityService } from './services/ActivityService';

const prisma = new PrismaClient();

export const ActivityManifest: AiModuleManifest = {
  moduleName: 'activity',
  actions: [
    {
      action: 'query_user_activity',
      description: 'Queries telemetry engagement statistics (messages, voice time, etc.) for a citizen. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The target Discord User ID (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        
        const stats = await prisma.activity_stats.findUnique({
          where: {
            guildId_userId_tenantId: { guildId, userId: targetId, tenantId }
          }
        });

        if (!stats) return { executed: true, result: `<@${targetId}> has no registered activity logs yet.` };

        const persona = ActivityService.getPersonaText(stats);

        return {
          executed: true,
          result: `**Activity Profile for <@${targetId}>**
Persona: ${persona}
Messages: ${Number(stats.totalMessages)}
Voice Hours: ${(Number(stats.totalVoiceTime) / 3600).toFixed(1)}
Media Sent: ${Number(stats.totalMedia)}
Emojis Used: ${Number(stats.totalEmojis)}
Reactions Given: ${Number(stats.totalReactions)}
Commands Executed: ${Number(stats.totalCommands)}`
        };
      }
    },
    {
      action: 'query_most_active_channels',
      description: 'Fetches the top active channels ranked by overall message counts.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const topChannels = await prisma.user_channel_logs.groupBy({
          by: ['channelId'],
          where: { guildId, tenantId },
          _sum: { messages: true },
          orderBy: { _sum: { messages: 'desc' } },
          take: 5
        });

        if (topChannels.length === 0) return { executed: true, result: 'No active channel logs found.' };

        const list = topChannels.map((c, idx) =>
          `**${idx + 1}.** <#${c.channelId}> — ${Number(c._sum.messages || 0)} messages`
        ).join('\n');

        return { executed: true, result: `Most Active Channels:\n${list}` };
      }
    },
    {
      action: 'query_server_growth',
      description: 'Queries server joins and leaves logs for the last 7 days.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { tenantId, guildId } = context;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const logs = await prisma.server_activity_logs.findMany({
          where: { guildId, tenantId, date: { gte: sevenDaysAgo } },
          orderBy: { date: 'asc' },
          take: 7
        });
        
        if (logs.length === 0) return { executed: true, result: 'No growth data found for the past 7 days.' };

        const list = logs.map(l =>
          `- **${l.date.toISOString().substring(0, 10)}**: +${Number(l.joins)} / -${Number(l.leaves)}`
        ).join('\n');
        
        return { executed: true, result: `Server Growth (Last 7 Days):\n${list}` };
      }
    }
  ]
};
