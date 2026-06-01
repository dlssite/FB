import { Guild, User, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { UtilityRepository } from '../database/UtilityRepository';

interface DMBroadcastOptions {
  tenantId: string;
  guildId: string;
  broadcasterId: string;
  targetType: 'all' | 'role' | 'specific_users';
  roleIds?: string[];
  userIds?: string[];
  messageText?: string;
  mediaUrls?: string[];
  guild: Guild;
}

export class BotDMService {
  /**
   * Broadcasts a DM to users based on the target type and filters
   */
  static async broadcastDM(options: DMBroadcastOptions): Promise<{
    broadcastId: number;
    totalRecipients: number;
    successCount: number;
    failureCount: number;
  }> {
    const { 
      tenantId, 
      guildId, 
      broadcasterId, 
      targetType, 
      roleIds = [], 
      userIds = [], 
      messageText, 
      mediaUrls = [],
      guild
    } = options;

    // Get list of recipients
    let recipients: User[] = [];

    if (targetType === 'all') {
      // Send to all members
      const members = await guild.members.fetch().catch(() => null);
      if (members) {
        recipients = Array.from(members.values())
          .filter(m => !m.user.bot)
          .map(m => m.user);
      }
    } else if (targetType === 'role' && roleIds.length > 0) {
      // Send to members with specific roles
      const members = await guild.members.fetch().catch(() => null);
      if (members) {
        recipients = Array.from(members.values())
          .filter(m => !m.user.bot && m.roles.cache.some(r => roleIds.includes(r.id)))
          .map(m => m.user);
      }
    } else if (targetType === 'specific_users' && userIds.length > 0) {
      // Send to specific users
      for (const userId of userIds) {
        try {
          const user = await guild.client.users.fetch(userId).catch(() => null);
          if (user && !user.bot) {
            recipients.push(user);
          }
        } catch (e) {
          // User not found, skip
        }
      }
    }

    // Create broadcast record
    const broadcast = await UtilityRepository.createBotDMBroadcast({
      tenantId,
      guildId,
      broadcasterId,
      targetType,
      roleIds,
      userIds,
      messageText,
      mediaUrls,
      totalRecipients: recipients.length
    });

    // Update status to in_progress
    await UtilityRepository.updateBotDMBroadcast(broadcast.id, {
      status: 'in_progress'
    });

    // Send DMs asynchronously
    let successCount = 0;
    let failureCount = 0;

    // Process sends in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const sendPromises = batch.map(user => 
        this.sendDMToUser(user, messageText, mediaUrls)
          .then(success => {
            if (success) successCount++;
            else failureCount++;
          })
          .catch(() => {
            failureCount++;
          })
      );

      await Promise.all(sendPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update broadcast with final status
    await UtilityRepository.updateBotDMBroadcast(broadcast.id, {
      status: 'completed',
      successCount,
      failureCount,
      completedAt: new Date()
    });

    return {
      broadcastId: broadcast.id,
      totalRecipients: recipients.length,
      successCount,
      failureCount
    };
  }

  /**
   * Sends a single DM to a user with text and optional media
   */
  private static async sendDMToUser(
    user: User,
    messageText?: string,
    mediaUrls?: string[]
  ): Promise<boolean> {
    try {
      const channel = await user.createDM().catch(() => null);
      if (!channel) return false;

      // If there's media to send, send text first, then media
      if (messageText) {
        // Split message if it's too long
        const chunks = this.splitMessage(messageText, 2000);
        for (const chunk of chunks) {
          await channel.send({
            content: chunk
          }).catch(() => null);
        }
      }

      // Send media (images/videos)
      if (mediaUrls && mediaUrls.length > 0) {
        for (const mediaUrl of mediaUrls) {
          try {
            await channel.send({
              files: [{
                attachment: mediaUrl,
                name: this.getFileName(mediaUrl)
              }]
            }).catch(async () => {
              // If attachment fails, try sending as embed link
              await channel.send({
                content: `📎 [View Media](${mediaUrl})`
              }).catch(() => null);
            });
          } catch (e) {
            // Continue with next media
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Splits a message into chunks to respect Discord's 2000 character limit
   */
  private static splitMessage(text: string, maxLength: number = 2000): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const lines = text.split('\n');
    for (const line of lines) {
      if ((currentChunk + line + '\n').length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * Generates a filename from a URL
   */
  private static getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'attachment';
    } catch {
      return 'attachment';
    }
  }

  /**
   * Gets broadcast history for a guild
   */
  static async getBroadcastHistory(tenantId: string, guildId: string, limit = 10) {
    return await UtilityRepository.getBotDMBroadcastsForGuild(tenantId, guildId, limit);
  }
}
