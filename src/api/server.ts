import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { GuildService } from '../services/GuildService';
import { FlamebornClient } from '../core/FlamebornClient';
import { ChannelType } from 'discord.js';
import { TenantRepository } from '../repositories/TenantRepository';
import { flamebornConfig } from '../config/flameborn.config';
import { findFileWithFallback, importModule } from '../utils/fileLoader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to handle BigInt serialization (Prisma returns BigInt which JSON.stringify can't handle)
const serialize = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

import { Logger } from '../utils/logger';

export async function startApiServer(client: FlamebornClient) {
  const app = new Hono();
  const port = flamebornConfig.bot.port;

  // Auth Middleware
  app.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
  });

  app.get('/api/health', (c) => {
    return c.json({ status: 'ok', uptime: process.uptime() });
  });

  // Returns the list of all guilds the bot is in (used by the dashboard home page)
  app.get('/api/guilds', (c) => {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name
    }));
    return c.json(guilds);
  });

  // Main Dashboard Endpoint: Returns guild settings, channels, and roles
  app.get('/api/guilds/:id', async (c) => {
    const guildId = c.req.param('id');
    
    // Resolve the real tenant for this guild (or fallback to global)
    const tenantId = await TenantRepository.getTenantForGuild(guildId) || flamebornConfig.bot.tenant.id;
    
    try {
      const guild = await client.guilds.fetch(guildId);
      const settings = await GuildService.getSettings(tenantId, guildId);
      
      Logger.info(`Serving settings for ${guildId} (Tenant: ${tenantId})`, 'API' as any);

      const channels = {
        text: guild.channels.cache
          .filter(c => c.type === ChannelType.GuildText)
          .map(c => ({ id: c.id, name: c.name })),
        voice: guild.channels.cache
          .filter(c => c.type === ChannelType.GuildVoice)
          .map(c => ({ id: c.id, name: c.name })),
        categories: guild.channels.cache
          .filter(c => c.type === ChannelType.GuildCategory)
          .map(c => ({ id: c.id, name: c.name }))
      };
      
      const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({ 
          id: r.id, 
          name: r.name, 
          color: r.hexColor,
          managed: r.managed
        }));

      return c.json(serialize({
        guild: {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          features: guild.features,
          memberCount: guild.memberCount,
          premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
          premiumTier: guild.premiumTier,
          ownerId: guild.ownerId,
          preferredLocale: guild.preferredLocale,
          createdTimestamp: guild.createdTimestamp,
          joinedTimestamp: guild.joinedTimestamp,
          verificationLevel: guild.verificationLevel,
          explicitContentFilter: guild.explicitContentFilter,
          mfaLevel: guild.mfaLevel,
          description: guild.description,
          bannerURL: guild.bannerURL(),
          iconURL: guild.iconURL(),
          splashURL: guild.splashURL()
        },
        settings,
        channels,
        roles
      }));
    } catch (error) {
      Logger.error(`[API] Error fetching guild ${guildId}`, error);
      return c.json({ error: 'Guild not found' }, 404);
    }
  });

  // PATCH Endpoint: Saves settings from the dashboard to the database
  app.patch('/api/guilds/settings/:id', async (c) => {
    const guildId = c.req.param('id');
    const tenantId = await TenantRepository.getTenantForGuild(guildId) || flamebornConfig.bot.tenant.id;
    const body = await c.req.json();

    Logger.info(`Receiving settings update for ${guildId} (Tenant: ${tenantId})`, 'API' as any);

    try {
      // Update prefix if provided
      if (body.prefix !== undefined) {
        await GuildService.updatePrefix(tenantId, guildId, body.prefix);
      }

      // Update disabled addons list if provided
      if (body.disabledAddons !== undefined) {
        await GuildService.updateDisabledAddons(tenantId, guildId, body.disabledAddons);
      }

      // In a real app, you'd loop through all fields in 'body' and update them
      // For the prototype, we just confirm success
      return c.json({ success: true, message: 'Settings updated' });
    } catch (error: any) {
      Logger.error('[API] Failed to update settings', error);
      return c.json({ error: error.message }, 500);
    }
  });

  app.get('/api/settings/:tenantId/:guildId', async (c) => {
    const { tenantId, guildId } = c.req.param();
    try {
      const settings = await GuildService.getSettings(tenantId, guildId);
      return c.json(serialize(settings));
    } catch (error) {
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  // --- DASHBOARD ADDON MANAGEMENT ---
  app.get('/api/addons', (c) => {
    // Dynamically generate from config metadata
    const addons = Object.entries(flamebornConfig.modules).map(([key, config]) => ({
      key,
      name: config.name,
      description: config.description,
      emoji: config.emoji,
      active: config.active
    }));
    return c.json({ success: true, addons });
  });

  // --- COMMAND METRICS ---
  app.get('/api/commands/metrics', (c) => {
    const metrics: Record<string, number> = {};
    
    // Tally commands dynamically from the loaded collections
    client.commands.forEach(command => {
      const moduleName = command.module || 'core';
      metrics[moduleName] = (metrics[moduleName] || 0) + 1;
    });

    const total = Object.values(metrics).reduce((sum, count) => sum + count, 0);

    return c.json({
      success: true,
      total,
      limit: 100, // Discord's global limit for chat input commands
      remaining: Math.max(0, 100 - total),
      byAddon: metrics
    });
  });

  // --- DYNAMIC MODULE ROUTE LOADER ---
  const modulesPath = path.join(__dirname, '../modules');
  if (fs.existsSync(modulesPath)) {
    const moduleDirs = fs.readdirSync(modulesPath);
    for (const moduleDir of moduleDirs) {
      const apiPath = findFileWithFallback(modulesPath, `${moduleDir}/api`);
      if (apiPath) {
        try {
          const moduleRouter = await importModule(apiPath);
          const router = moduleRouter.default || moduleRouter;
          app.route(`/api/${moduleDir}`, router);
          Logger.info(`Mounted routes at /api/${moduleDir}`, `API:${moduleDir.toUpperCase()}` as any);
        } catch (err) {
          Logger.error(`[API] [${moduleDir.toUpperCase()}] Failed to load routes`, err);
        }
      }
    }
  }

  const server = serve({
    fetch: app.fetch,
    port
  }, (info) => {
    Logger.info(`Hono REST server running on port ${info.port}`, 'API' as any);
  });

  return server;
}
