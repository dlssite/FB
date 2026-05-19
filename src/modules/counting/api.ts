import { Hono } from 'hono';

const app = new Hono();

app.get('/status', (c) => {
  return c.json({ status: 'active' });
});

export default app;
