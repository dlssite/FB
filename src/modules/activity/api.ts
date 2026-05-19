import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';

const app = new Hono();
const prisma = new PrismaClient();

app.get('/summary', async (c) => {
  const tenantId = c.req.query('tenantId') || 'default';
  const guildId = c.req.query('guildId');

  if (!guildId) return c.json({ error: 'Missing guildId parameter' }, 400);

  // Fetch cumulative text and voice stats
  const aggregateStats = await prisma.activity_stats.aggregate({
    where: { guildId, tenantId },
    _sum: {
      totalMessages: true,
      totalVoiceTime: true,
      totalMedia: true
    }
  });

  // Fetch daily logs of joins/leaves for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const growthLogs = await prisma.server_activity_logs.findMany({
    where: {
      guildId,
      tenantId,
      date: { gte: sevenDaysAgo }
    },
    orderBy: { date: 'asc' }
  });

  return c.json({
    totalMessages: Number(aggregateStats._sum.totalMessages || 0),
    totalVoiceMinutes: Math.floor(Number(aggregateStats._sum.totalVoiceTime || 0) / 60),
    totalMedia: Number(aggregateStats._sum.totalMedia || 0),
    growth: growthLogs.map(log => ({
      date: log.date.toISOString().substring(0, 10),
      joins: Number(log.joins),
      leaves: Number(log.leaves),
      peakVoice: Number(log.peakVoice)
    }))
  });
});

export default app;
