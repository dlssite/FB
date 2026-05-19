import { Hono } from 'hono';
import { BoosterRepository } from './database/BoosterRepository';

const app = new Hono();

/**
 * GET /api/booster/stats
 * Retrieves booster statistics and configuration for the dashboard.
 */
app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');

  if (!tenantId || !guildId) {
    return c.json({ error: 'Missing tenantId or guildId parameters' }, 400);
  }

  try {
    const settings = await BoosterRepository.getSettings(tenantId, guildId);
    const roles = await BoosterRepository.getGuildRoles(tenantId, guildId);
    
    // Count how many of the roles have a buddy assigned
    const buddyCount = roles.filter(r => r.buddyId).length;

    return c.json({
      status: 'active',
      customRolesCount: roles.length,
      buddiesLinked: buddyCount,
      settings: settings || null
    });
  } catch (error) {
    console.error('[Booster API] Error fetching stats:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /api/booster/roles
 * Retrieves a list of all active custom booster roles for the guild.
 */
app.get('/roles', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');

  if (!tenantId || !guildId) {
    return c.json({ error: 'Missing tenantId or guildId parameters' }, 400);
  }

  try {
    const roles = await BoosterRepository.getGuildRoles(tenantId, guildId);
    
    return c.json({
      roles: roles.map(r => ({
        ownerId: r.ownerId,
        roleId: r.roleId,
        buddyId: r.buddyId,
        isGrace: r.isGrace,
        graceUntil: r.graceUntil
      }))
    });
  } catch (error) {
    console.error('[Booster API] Error fetching roles:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
