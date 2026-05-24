import { Guild } from 'discord.js';
import { ActivityLogService } from '../services/ActivityLogService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: 'emojiUpdate',
  async execute(oldGuild: Guild, newGuild: Guild) {
    try {
      const guildId = newGuild.id;
      const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

      // Quick heuristic: list difference sizes
      const oldCount = oldGuild.emojis.cache.size;
      const newCount = newGuild.emojis.cache.size;
      const changes: string[] = [`Old Count: ${oldCount}`, `New Count: ${newCount}`];

      await ActivityLogService.sendServerLog(newGuild, tenantId, 'emoji_update', { changes });
    } catch (err) {
      console.error('[ACTIVITY EMOJI UPDATE ERROR]', err);
    }
  }
};
