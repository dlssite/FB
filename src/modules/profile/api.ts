import { Hono } from 'hono';
import { ProfileRepository } from './database/ProfileRepository';
import { ProfileService } from './services/ProfileService';

const router = new Hono();

/**
 * GET /api/profile/:userId
 * Returns the aggregated universal profile of a user.
 */
router.get('/:userId', async (c) => {
  const userId = c.req.param('userId');
  const tenantId = c.req.header('x-tenant-id') || 'tenant_alpha_01';
  const guildId = c.req.query('guildId') || '';

  try {
    const profile = await ProfileRepository.getProfile(tenantId, userId);
    const aiData = await ProfileService.getProfileAiData(tenantId, guildId, userId);
    
    return c.json({ 
      success: true, 
      data: {
        identity: profile,
        modules: aiData
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default router;
