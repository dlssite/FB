import { Hono } from 'hono';
import { prisma } from '../../database/client';

const app = new Hono();

app.get('/status', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');

  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  const settings = await prisma.music_settings.findUnique({
    where: { guildId_tenantId: { guildId, tenantId } }
  });

  return c.json({ 
    status: settings ? 'active' : 'inactive',
    isLocked: settings?.isLocked || false,
    autoResume: (settings as any).autoResume || true
  });
});

app.get('/top-listeners', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');

  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  const top = await prisma.music_user_stats.findMany({
    where: { tenantId, guildId },
    orderBy: { totalListenTime: 'desc' },
    take: 10
  });

  return c.json(top);
});

export default app;
