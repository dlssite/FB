import { Hono } from 'hono';
import { WelcomeRepository } from './database/WelcomeRepository';
import { TenantRepository } from '../../repositories/TenantRepository';

const api = new Hono();

// Helper to handle BigInt serialization
const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// GET /api/welcomer/:guildId
api.get('/:guildId', async (c) => {
  const guildId = c.req.param('guildId');
  const tenantId = await TenantRepository.getTenantForGuild(guildId) || process.env.TENANT_ID || 'tenant_alpha_01';
  
  const settings = await WelcomeRepository.getSettings(tenantId, guildId);
  return c.json(serialize(settings || { error: 'No settings found' }));
});

// PATCH /api/welcomer/:guildId
api.patch('/:guildId', async (c) => {
  const guildId = c.req.param('guildId');
  const tenantId = await TenantRepository.getTenantForGuild(guildId) || process.env.TENANT_ID || 'tenant_alpha_01';
  const body = await c.req.json();

  console.log(`[API] [WELCOMER] Updating settings for ${guildId}:`, body);

  try {
    const updated = await WelcomeRepository.upsertSettings(tenantId, guildId, body);
    return c.json({ success: true, data: serialize(updated) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default api;
