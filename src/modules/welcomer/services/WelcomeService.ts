import { GuildMember, TextChannel, AttachmentBuilder, MessageFlags } from 'discord.js';
import { ContainerService, sendV2 } from '../../../utils/container';
import { WelcomeRepository } from '../database/WelcomeRepository';
import { PlaceholderService } from '../../../utils/placeholder';
import { CanvasService } from './CanvasService';

export class WelcomeService {
  /**
   * Handles a new member joining a guild.
   */
  static async handleJoin(member: GuildMember, tenantId: string) {
    const settings = await WelcomeRepository.getSettings(tenantId, member.guild.id);
    if (!settings || !settings.welcomeInOn || !settings.welcomeInChannelId) return;

    const channel = member.guild.channels.cache.get(settings.welcomeInChannelId) as TextChannel;
    if (!channel) return;

    // 1. Generate Welcome Card (Canvas)
    const cardBuffer = await CanvasService.generateWelcomeCard({
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL({ extension: 'png' }),
      guildName: member.guild.name,
      memberCount: member.guild.memberCount,
      settings
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'welcome-card.png' });

    const messageText = PlaceholderService.parse(settings.welcomeInEmbedText || 'Welcome {user.mention} to {server.name}!', { member });

    // If a custom background URL is configured, upload first to obtain a CDN URL
    if (settings.welcomeInBackgroundUrl && settings.welcomeInBackgroundUrl.startsWith('http')) {
      try {
        const uploadMsg = await channel.send({ files: [attachment] });
        const uploaded = uploadMsg && uploadMsg.attachments && uploadMsg.attachments.first();
        const imageUrl = uploaded ? uploaded.url : undefined;

        const welcomeContainer = ContainerService.create({
          description: messageText,
          color: settings.welcomeInEmbedColor as any || '#7367F0',
          media: imageUrl ? [imageUrl] : []
        });

         // Send the container message using sendV2 (no content field allowed with V2 components)
         await sendV2(channel, welcomeContainer).catch(console.error);

         // Cleanup the temporary upload message
         if (uploadMsg && imageUrl) {
           try { await uploadMsg.delete().catch(() => {}); } catch {}
         }
       } catch (err) {
         // Fallback to sending as attachment if upload fails
         const welcomeContainer = ContainerService.create({
           description: messageText,
           color: settings.welcomeInEmbedColor as any || '#7367F0',
           media: ['attachment://welcome-card.png']
         });

         await sendV2(channel, welcomeContainer, [attachment]).catch(console.error);
      }
    } else {
      // No custom background configured — send the generated canvas directly as the panel image
      const welcomeContainer = ContainerService.create({
        description: messageText,
        color: settings.welcomeInEmbedColor as any || '#7367F0',
        media: ['attachment://welcome-card.png']
      });

      await sendV2(channel, welcomeContainer, [attachment]).catch(console.error);
    }
  }

  /**
   * Handles a member leaving a guild.
   */
  static async handleLeave(member: GuildMember, tenantId: string) {
    const settings = await WelcomeRepository.getSettings(tenantId, member.guild.id);
    if (!settings || !settings.welcomeOutOn || !settings.welcomeOutChannelId) return;

    const channel = member.guild.channels.cache.get(settings.welcomeOutChannelId) as TextChannel;
    if (!channel) return;

    const messageText = PlaceholderService.parse(settings.welcomeOutEmbedText || '{user.tag} has left the server.', { member });

    await channel.send({ content: messageText }).catch(console.error);
  }
}
