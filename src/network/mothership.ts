import { io, Socket } from 'socket.io-client';
import { client as discordClient } from '../core/FlamebornClient';
import { Logger } from '../utils/logger';
import { flamebornConfig } from '../config/flameborn.config';

export class MothershipConnection {
  private socket: Socket;
  private heartbeatInterval?: NodeJS.Timeout;
  private botId: string = flamebornConfig.bot.id;

  constructor() {
    const url = flamebornConfig.bot.mothershipUrl;
    
    // Mothership server expects 'token' for authentication
    this.socket = io(url, {
      auth: {
        token: process.env.API_SECRET,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    this.registerEvents();
  }

  private registerEvents() {
    this.socket.on('connect', () => {
      Logger.info(`Connected via socket ${this.socket.id}`, 'FLEET' as any);
      
      // Mothership server expects 'botId', not 'id'
      this.socket.emit('register', {
        botId: this.botId,
        type: 'bot',
        status: 'online',
        guildCount: discordClient.guilds.cache.size,
        uptime: process.uptime()
      });

      this.startHeartbeat();
    });

    this.socket.on('registered', () => {
      Logger.info('Bot registration confirmed by server.', 'FLEET' as any);
    });

    this.socket.on('disconnect', (reason) => {
      Logger.warn(`[FLEET] Disconnected: ${reason}`);
      this.stopHeartbeat();
    });

    this.socket.on('fleet_command', (data) => {
      Logger.info(`Received fleet command: ${JSON.stringify(data)}`, 'FLEET' as any);
    });

    this.socket.on('remote:shutdown', () => {
      Logger.error('[FLEET] Remote shutdown command received!');
      process.exit(0);
    });

    this.socket.on('remote:guild_update', async (data: { guildId: string }) => {
      if (data.guildId) {
        Logger.info(`Invalidating settings cache for guild: ${data.guildId}`, 'FLEET' as any);
        const { TenantRepository } = await import('../repositories/TenantRepository');
        const { GuildService } = await import('../services/GuildService');
        const { LevelingRepository } = await import('../modules/leveling/database/LevelingRepository');
        const { AutomodRepository } = await import('../modules/automod/database/AutomodRepository');
        const { InviteRepository } = await import('../modules/invite/database/InviteRepository');
        
        // Resolve tenant for this guild to clear module-specific caches
        const tenantId = await TenantRepository.getTenantForGuild(data.guildId) || flamebornConfig.bot.tenant.id;

        TenantRepository.invalidateCache(data.guildId);
        GuildService.invalidateCache(data.guildId);
        LevelingRepository.invalidateCache(tenantId, data.guildId);
        AutomodRepository.invalidateCache(tenantId, data.guildId);
        InviteRepository.invalidateCache(tenantId, data.guildId);
      }
    });

    this.socket.on('remote:fleet_routing_update', async (data: { guildId: string }) => {
      if (data.guildId) {
        Logger.info(`Invalidating routing matrix cache for guild: ${data.guildId}`, 'FLEET' as any);
        const { RoutingService } = await import('../services/RoutingService');
        RoutingService.invalidateCache(data.guildId);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket.connected) {
        // Match the Mothership's telemetry expected keys
        this.socket.emit('telemetry', {
          botId: this.botId,
          tenantId: flamebornConfig.bot.tenant.id,
          status: 'online',
          guilds: discordClient.guilds.cache.size,
          shards: discordClient.shard?.count || 1,
          uptime: Math.floor(process.uptime()),
          memory: {
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal
          },
          guildDetails: discordClient.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL() || null,
            memberCount: g.memberCount || 0,
            premiumTier: g.premiumTier || 0
          })),
          availableAddons: Array.from(new Set(discordClient.commands.map(cmd => cmd.module || 'core'))).filter(m => m !== 'core')
        });
      }
    }, 15000); // 15 seconds for more responsive dashboard
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  public sendTelemetry(data: any) {
    if (this.socket.connected) {
      this.socket.emit('telemetry', {
        botId: this.botId,
        ...data
      });
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    this.socket.disconnect();
  }
}

export const mothership = new MothershipConnection();
