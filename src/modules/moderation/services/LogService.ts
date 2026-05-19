import { TextChannel, Guild } from 'discord.js';
import { prisma } from '../../../database/client';
import { ContainerService } from '../../../utils/container';

export class LogService {
  /**
   * Posts a moderation case to the server's log channel.
   */
  static async logCase(guild: Guild, tenantId: string, data: {
    action: string;
    moderator: string;
    target: string;
    reason: string;
    color: string;
  }) {
    // Fetch settings from server_settings (global layer)
    const settings = await prisma.server_settings.findUnique({
      where: { guildId_tenantId: { guildId: guild.id, tenantId } },
      select: { modLogChannelId: true }
    });
    
    if (!settings || !settings.modLogChannelId) return;

    const channel = guild.channels.cache.get(settings.modLogChannelId);
    if (!channel || !channel.isTextBased()) {
      console.warn(`[LogService] Log channel ${settings.modLogChannelId} not found or is not text-based.`);
      return;
    }

    const logContainer = ContainerService.create({
      title: `🛡️ Moderation Log | ${data.action}`,
      color: data.color as any,
      fields: [
        { name: 'Target', value: data.target },
        { name: 'Moderator', value: data.moderator },
        { name: 'Reason', value: data.reason }
      ],
      footer: `Flameborn Security • ${tenantId}`
    });

    await channel.send(logContainer).catch(() => {});
  }
}
