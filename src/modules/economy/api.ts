import { Hono } from 'hono';
import { EconomyRepository } from './database/EconomyRepository';
import { MarketEngine } from './services/MarketEngine';

const router = new Hono();

// Helper to handle BigInt serialization
const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * GET /api/economy/user/:userId
 * Returns the economy profile of a user.
 */
router.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01';

  try {
    const user = await EconomyRepository.getUser(tenantId, userId);
    const inventory = await EconomyRepository.getInventory(tenantId, userId);
    
    return c.json({ 
      success: true, 
      data: serialize({
        profile: user,
        inventory: inventory
      })
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PATCH /api/economy/balance/:userId
 * Adjusts a user's balance (Admin tool for dashboard).
 */
router.patch('/balance/:userId', async (c) => {
  const userId = c.req.param('userId');
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01';
  const body = await c.req.json();

  try {
    const updated = await EconomyRepository.updateBalance(tenantId, userId, {
      embers: body.embers,
      ruby: body.ruby,
      vault: body.vault
    });
    return c.json({ success: true, data: serialize(updated) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/economy/market
 * Returns live market prices for all resources.
 */
router.get('/market', async (c) => {
  try {
    const prices = await MarketEngine.getPrices();
    return c.json({ success: true, data: prices });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
