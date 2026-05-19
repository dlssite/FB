import { Hono } from 'hono';

const app = new Hono();

app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');

  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  // In the future, we can add a database model for fun_stats if the user wants it.
  // For now, we return active status.
  return c.json({ status: 'active', commandsUsed: 'N/A' });
});

export default app;
