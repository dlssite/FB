import 'dotenv/config';
import { client } from './core/FlamebornClient';
import { loadCommands } from './core/commandLoader';
import { loadEvents } from './core/eventLoader';
import { startApiServer } from './api/server';
import { Translator } from './core/Translator';
import { TenantService } from './services/TenantService';
import { flamebornConfig } from './config/flameborn.config';
import './network/mothership'; // Init Mothership connection

import { Logger } from './utils/logger';

let apiServer: Awaited<ReturnType<typeof startApiServer>> | undefined;
let isShuttingDown = false;

async function bootstrap() {
  Logger.info('Starting Flameborn Prototype...', 'SYSTEM' as any);

  // 0. Legal Check (Mirroring legacy bot safety)
  if (!flamebornConfig.legal.acceptTOS || !flamebornConfig.legal.dataCollection) {
    Logger.error('🔥 FATAL: You must accept the TOS and Data Collection in the active config to start the bot.');
    process.exit(1);
  }

  // 1. Database Connection Test
  try {
    const { prisma } = await import('./database/client');
    await prisma.$connect();
    Logger.prisma('Database connection established.');
  } catch (err) {
    Logger.error('❌ FATAL: Database connection failed!', err);
    process.exit(1);
  }

  // 2. Ensure Tenant exists in DB (creates it if missing based on .env)
  await TenantService.ensureTenant();
  Translator.loadAll();

  // 2. Load commands and events
  await loadCommands(client);
  await loadEvents(client);

  // 3. Initialize Universal Profile Providers
  if (flamebornConfig.modules.profile?.active) {
    const { initProfileProviders } = await import('./modules/profile/providers');
    await initProfileProviders();
  }

  // 3. Initialize AI Cognitive Engine Manifests
  if (flamebornConfig.modules.ai?.active) {
    const { loadAiManifests } = await import('./modules/ai/loaders/manifestLoader');
    await loadAiManifests();
  }

  // 4. Start minimal API
  apiServer = await startApiServer(client);

  // 4. Start Background Workers
  if (flamebornConfig.modules.economy?.active) {
    const { EconomyService } = await import('./modules/economy/services/EconomyService');
    EconomyService.startMiningWorker();
  }

  if (flamebornConfig.modules.activity?.active) {
    const { ActivityService } = await import('./modules/activity/services/ActivityService');
    // Flush telemetry buffer from Redis to PostgreSQL every 5 minutes
    setInterval(() => ActivityService.flushTelemetryToDb(), 300000);
  }

  if (flamebornConfig.modules.leveling?.active) {
    const { LevelingService } = await import('./modules/leveling/services/LevelingService');
    // Start Top Leveler Role worker
    setInterval(() => LevelingService.tickTopLevelerRole(), 300000); // Every 5 mins
  }

  if (flamebornConfig.modules.utility?.active) {
    const { HeaderRoleService } = await import('./modules/utility/services/HeaderRoleService');
    client.once('ready', () => HeaderRoleService.refreshAll(client).catch(console.error));
    setInterval(() => HeaderRoleService.refreshAll(client), 300000); // Every 5 mins
  }

  if (flamebornConfig.modules.birthday?.active) {
    const { BirthdayService } = await import('./modules/birthday/services/BirthdayService');
    BirthdayService.startBirthdayWorker(client);
  }

  if (flamebornConfig.modules.booster?.active) {
    const { BoosterService } = await import('./modules/booster/services/BoosterService');
    BoosterService.startBoosterWorker(client);
  }

  if (flamebornConfig.modules.giveaway?.active) {
    const { GiveawayWorkerService } = await import('./modules/giveaway/services/GiveawayWorkerService');
    GiveawayWorkerService.startWorker(client);
  }

  if (flamebornConfig.modules.transportation?.active) {
    const { TransportationService } = await import('./modules/transport/services/TransportationService');
    setInterval(() => TransportationService.processArrivals(client), 30000); // Check every 30s
  }

  if (flamebornConfig.modules.shop?.active) {
    const { AuctionService } = await import('./modules/shop/services/AuctionService');
    const { shopRegistry } = await import('./modules/shop/catalog/engine/Registry');
    Logger.info('Hyper-Shop Economy Engine engaged.', 'SHOP' as any);
    await shopRegistry.loadCatalog(); // Pre-load catalog to prevent latency issues later
    
    // Resolve expired auctions every 60 seconds
    setInterval(() => AuctionService.processExpiredAuctions(), 60000);
  }

  // 5. Connect to Discord
  if (!process.env.DISCORD_TOKEN || process.env.DISCORD_TOKEN === 'your_discord_bot_token_here') {
    console.warn('[Warning] DISCORD_TOKEN is missing or default. Bot will not login.');
    return;
  }
  await client.login(process.env.DISCORD_TOKEN);
}

import { mothership } from './network/mothership';

bootstrap().catch((error) => {
  Logger.error('Bootstrap failed', error);
  process.exit(1);
});

const shutdown = async (reason?: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  Logger.info(`Shutting down${reason ? ` (${reason})` : ''}...`, 'SYSTEM' as any);

  try {
    mothership.disconnect();
  } catch (error) {
    Logger.error('Error disconnecting mothership', error);
  }

  try {
    if (apiServer) {
      await new Promise<void>((resolve, reject) => {
        apiServer!.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
      Logger.info('API server shut down cleanly.', 'API' as any);
    }
  } catch (error) {
    Logger.error('Error shutting down API server', error);
  }

  try {
    client.destroy();
  } catch (error) {
    Logger.error('Error destroying Discord client', error);
  }

  setTimeout(() => {
    Logger.error('Forcing process exit due to shutdown timeout.', 'SYSTEM' as any);
    process.exit(1);
  }, 5000).unref();

  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled promise rejection', reason as any);
  void shutdown('unhandledRejection');
});
