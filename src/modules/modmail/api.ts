import { Hono } from 'hono';
import { prisma } from '../../database/client';
import { ModmailRepository } from './database/ModmailRepository';

const app = new Hono();

app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const expectedSecret = process.env.API_SECRET || 'FLAMEBORN_SECURE_TOKEN';
  
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  await next();
});

app.get('/transcripts/:ticketId', async (c) => {
  const tenantId = c.req.query('tenantId');
  const ticketId = parseInt(c.req.param('ticketId'));
  
  if (!tenantId || isNaN(ticketId)) return c.json({ error: 'Missing parameters' }, 400);

  const messages = await ModmailRepository.getMessages(tenantId, ticketId);
  return c.json({ status: 'success', transcript: messages });
});

app.get('/tickets', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing parameters' }, 400);

  const tickets = await prisma.modmail_tickets.findMany({
    where: { tenantId, guildId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return c.json({ status: 'success', tickets });
});

export default app;
