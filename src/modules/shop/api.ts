import { Hono } from 'hono';
import { prisma } from '../../database/client';
import { shopRegistry } from './catalog/engine/Registry';
import { InventoryService } from './services/InventoryService';

const api = new Hono();

/**
 * GET /api/shop/categories
 * Returns all active shop categories from the Code Registry.
 */
api.get('/categories', async (c) => {
  await shopRegistry.loadCatalog();
  const categories = shopRegistry.getCategories();
  return c.json({ success: true, categories });
});

/**
 * GET /api/shop/items/:category
 * Returns all items for a specific category from the Code Registry.
 */
api.get('/items/:category', async (c) => {
  const categoryId = c.req.param('category');
  await shopRegistry.loadCatalog();
  const items = shopRegistry.getItemsByCategory(categoryId);
  return c.json({ success: true, items });
});

/**
 * GET /api/shop/inventory/:guildId/:userId
 * Returns a user's full inventory, hydrated from the Code Registry.
 */
api.get('/inventory/:guildId/:userId', async (c) => {
  const { guildId, userId } = c.req.param();
  const tenantId = 'tenant_alpha_01'; // Should be resolved from headers in production

  const inventory = await InventoryService.getHydratedCategoryItems(tenantId, guildId, userId);

  return c.json({ success: true, inventory });
});

export default api;
