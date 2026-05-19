import { Hono } from 'hono';
import { GiveawayRepository } from './database/GiveawayRepository';

const app = new Hono();

app.get('/active', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  const giveaways = await GiveawayRepository.getActiveGiveawaysByGuild(tenantId, guildId);
  return c.json({ status: 'success', total: giveaways.length, giveaways });
});

export default app;
