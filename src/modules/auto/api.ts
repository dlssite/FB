import { Hono } from 'hono';
import { prisma } from '../../database/client';

const router = new Hono();

// Helper to handle BigInt serialization (if needed for future fields)
const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * GET /api/auto/triggers
 * Returns all active auto triggers for the dashboard.
 */
router.get('/triggers', async (c) => {
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01';
  const guildId = c.req.header('x-guild-id');

  if (!guildId) {
    return c.json({ success: false, error: 'x-guild-id header is required' }, 400);
  }

  try {
    const triggers = await prisma.auto_triggers.findMany({
      where: { tenantId, guildId }
    });
    
    return c.json({ 
      success: true, 
      data: serialize(triggers)
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/auto/trigger/:id
 * Allows the dashboard to delete a trigger.
 */
router.delete('/trigger/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01';
  const guildId = c.req.header('x-guild-id');

  if (!guildId) {
    return c.json({ success: false, error: 'x-guild-id header is required' }, 400);
  }

  try {
    await prisma.auto_triggers.delete({
      where: { id, tenantId, guildId }
    });
    return c.json({ success: true, message: 'Trigger deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
