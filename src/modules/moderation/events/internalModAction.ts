import { ModerationRepository } from '../database/ModerationRepository';
import { LogService } from '../services/LogService';

export default {
  name: 'internalModAction',
  once: false,
  async execute(payload: any) {
    const { guild, tenantId, moderatorId, moderatorTag, targetId, targetTag, action, reason, color } = payload;

    try {
      // 1. Log to DB for persistence
      await ModerationRepository.logAction({
        guildId: guild.id,
        tenantId,
        moderatorId,
        moderatorTag,
        targetId,
        targetTag,
        action,
        reason,
      });

      // 2. Log to the server's mod feed
      if (guild) {
        await LogService.logCase(guild, tenantId, {
          action,
          moderator: moderatorTag,
          target: `${targetTag} (${targetId})`,
          reason,
          color: color || '#EA5455'
        });
      }
    } catch (error) {
      console.error('[internalModAction] Failed to process decoupled mod action:', error);
    }
  }
};
