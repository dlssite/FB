import { Events } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { GamifyService } from '../services/GamifyService';
import { SocialService } from '../services/SocialService';
import { SpatialAudioService } from '../services/SpatialAudioService';
import { initLavalink } from '../services/LavalinkManager';
import { client } from '../../../core/FlamebornClient';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: any) {
    Logger.loader('[SYMPHONY] Initializing Music Satellite Modules...');
    
    // Short delay to ensure client.user.id is accessible (fixes Shoukaku UserId error)
    setTimeout(() => {
      initLavalink(client);

      // Initialize Satellite Layers
      GamifyService.init();
      SocialService.init();
      SpatialAudioService.init();

      Logger.loader('[SYMPHONY] Core and Satellite systems online.');
    }, 1000);
  }
};
