import { Hono } from 'hono';
import { prisma } from '../../database/client';

const app = new Hono();

/**
 * GET /stats
 * Returns global birthday metrics for the guild.
 */
app.get('/stats', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing tenantId or guildId' }, 400);

  const totalBirthdays = await prisma.user_birthdays.count({ where: { tenantId, guildId } });
  const totalWishes = await prisma.birthday_wishes.count({ where: { tenantId, guildId } });
  
  // Find upcoming birthdays this month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const upcomingThisMonth = await prisma.user_birthdays.count({
    where: { 
      tenantId, 
      guildId,
      month: currentMonth,
      day: { gte: now.getDate() }
    }
  });

  return c.json({
    totalCelebrants: totalBirthdays,
    totalWishesSent: totalWishes,
    upcomingThisMonth,
    module: 'birthday',
    status: 'active'
  });
});

/**
 * GET /settings
 * Returns the current birthday settings for the guild.
 */
app.get('/settings', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing tenantId or guildId' }, 400);

  const settings = await prisma.birthday_settings.findUnique({
    where: { 
      guildId_tenantId: {
        guildId,
        tenantId
      }
    }
  });

  return c.json(settings || { error: 'Settings not configured' });
});

/**
 * GET /list
 * Returns a list of all birthdays in the guild.
 */
app.get('/list', async (c) => {
  const tenantId = c.req.query('tenantId');
  const guildId = c.req.query('guildId');
  
  if (!tenantId || !guildId) return c.json({ error: 'Missing tenantId or guildId' }, 400);

  const birthdays = await prisma.user_birthdays.findMany({
    where: { tenantId, guildId },
    orderBy: [
      { month: 'asc' },
      { day: 'asc' }
    ]
  });

  return c.json(birthdays);
});

export default app;
