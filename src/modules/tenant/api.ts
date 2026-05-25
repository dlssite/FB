import { Hono } from 'hono';
import { TenantService } from '../../services/TenantService';

const app = new Hono();

/**
 * Get tenant information by ID
 */
app.get('/api/tenants/:tenantId', async (c) => {
  const tenantId = c.req.param('tenantId');

  try {
    const tenant = await TenantService.getTenantInfo(tenantId);
    
    if (!tenant) {
      return c.json({ success: false, error: 'Tenant not found' }, 404);
    }

    return c.json({
      success: true,
      data: tenant
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * Get modules for a specific tenant
 */
app.get('/api/tenants/:tenantId/modules', async (c) => {
  const tenantId = c.req.param('tenantId');

  try {
    const modules = await TenantService.getTenantModules(tenantId);
    
    return c.json({
      success: true,
      data: {
        tenantId,
        modules,
        activeCount: modules.filter((m: any) => m.isActive).length
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * List all tenants
 */
app.get('/api/tenants', async (c) => {
  try {
    const tenants = await TenantService.listAllTenants();
    
    return c.json({
      success: true,
      data: {
        count: tenants.length,
        tenants
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
