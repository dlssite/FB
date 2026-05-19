import { Events, Client } from 'discord.js';
import { InviteTracker } from '../services/InviteTracker';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    if (!flamebornConfig.modules.invite.active) return;
    
    Logger.info('Syncing server invites to cache...', 'InviteTracker' as any);
    for (const [id, guild] of client.guilds.cache) {
      await InviteTracker.syncGuild(guild);
    }
  }
};
