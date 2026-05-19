import { Hono } from 'hono';
import { TerritoryRepository } from './database/TerritoryRepository';

const router = new Hono();

// Helper to handle BigInt serialization
const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * GET /api/territory/nations/:guildId
 * Returns all registered nations for a guild.
 */
router.get('/nations/:guildId', async (c) => {
  const guildId = c.req.param('guildId');
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01'; // Default or passed from dashboard

  try {
    const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
    return c.json({ success: true, data: serialize(nations) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/territory/info/:guildId/:categoryId
 * Returns specific nation details.
 */
router.get('/info/:guildId/:categoryId', async (c) => {
  const { guildId, categoryId } = c.req.param();
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01';

  try {
    const nation = await TerritoryRepository.getByCategoryId(tenantId, guildId, categoryId);
    if (!nation) return c.json({ success: false, error: 'Nation not found' }, 404);
    return c.json({ success: true, data: serialize(nation) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
