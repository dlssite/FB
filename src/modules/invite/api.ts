import { Hono } from 'hono';
import { InviteRepository } from './database/InviteRepository';

const app = new Hono();

/**
 * GET /api/invite/stats
 * Retrieves invite settings for the dashboard.
 */
app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');

  if (!tenantId || !guildId) {
    return c.json({ error: 'Missing tenantId or guildId parameters' }, 400);
  }

  try {
    const settings = await InviteRepository.getSettings(tenantId, guildId);

    return c.json({
      status: 'active',
      settings: settings || null
    });
  } catch (error) {
    console.error('[Invite API] Error fetching stats:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/invite/leaderboard
 * Retrieves the top inviters for the guild dashboard.
 */
app.get('/leaderboard', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  const limit = Number(c.req.query('limit')) || 10;

  if (!tenantId || !guildId) {
    return c.json({ error: 'Missing tenantId or guildId parameters' }, 400);
  }

  try {
    const leaderboard = await InviteRepository.getLeaderboard(tenantId, guildId, limit);
    
    return c.json({
      leaderboard
    });
  } catch (error) {
    console.error('[Invite API] Error fetching leaderboard:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
