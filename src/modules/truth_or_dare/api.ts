import { Hono } from 'hono';
import { prisma } from '../../database/client';

const app = new Hono();

// Route: GET /api/truth_or_dare/stats?tenantId=...&guildId=...
app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  const stats = await prisma.tod_player_stats.aggregate({
    where: { tenantId },
    _sum: {
      bravePoints: true,
      truthsAnswered: true,
      daresCompleted: true
    },
    _count: {
      userId: true
    }
  });
  
  return c.json({ 
    totalPlayers: stats._count.userId,
    totalPoints: stats._sum.bravePoints || 0,
    totalTruths: stats._sum.truthsAnswered || 0,
    totalDares: stats._sum.daresCompleted || 0
  });
});

// Route: GET /api/truth_or_dare/leaderboard?tenantId=...
app.get('/leaderboard', async (c) => {
  const tenantId = c.req.query('tenantId');
  if (!tenantId) return c.json({ error: 'Missing parameters' }, 400);

  const players = await prisma.tod_player_stats.findMany({
    where: { tenantId },
    orderBy: { bravePoints: 'desc' },
    take: 10,
    select: {
      userId: true,
      bravePoints: true,
      daresCompleted: true
    }
  });

  return c.json(players);
});

export default app;
