import { Hono } from 'hono';
import { LevelingRepository } from './database/LevelingRepository';
import { prisma } from '../../database/client';

const app = new Hono();

// Helper to handle BigInt serialization
const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * GET /stats
 * Returns global leveling metrics for the guild.
 */
app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing tenantId or guildId' }, 400);

  const totalUsers = await prisma.users.count({ where: { tenantId, guildId } });
  const totalXp = await prisma.users.aggregate({
    where: { tenantId, guildId },
    _sum: { xp: true }
  });

  return c.json({
    totalCitizens: totalUsers,
    totalNeuralXp: totalXp._sum.xp || 0,
    module: 'leveling',
    status: 'active'
  });
});

/**
 * GET /leaderboard
 * Returns the top 100 neural citizens.
 */
app.get('/leaderboard', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing tenantId or guildId' }, 400);

  const top = await LevelingRepository.getTopLevelers(tenantId, guildId, 100);
  return c.json(serialize(top));
});

/**
 * GET /user/:userId
 * Returns specific neural data for a user.
 */
app.get('/user/:userId', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  const userId = c.req.param('userId');
  
  if (!tenantId || !guildId || !userId) return c.json({ error: 'Missing parameters' }, 400);

  const user = await LevelingRepository.getUser(tenantId, guildId, userId);
  if (!user) return c.json({ error: 'User not found in neural registry' }, 404);

  const rank = await LevelingRepository.getUserRank(tenantId, guildId, userId);

  return c.json(serialize({
    ...user,
    rank
  }));
});

export default app;
