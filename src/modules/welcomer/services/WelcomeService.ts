import { GuildMember, TextChannel, AttachmentBuilder } from 'discord.js';
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

    // 2. Parse Text
    const messageText = PlaceholderService.parse(settings.welcomeInEmbedText || 'Welcome {user.mention} to {server.name}!', { member });

    // 3. Prepare Message
    if (settings.welcomeInOn || true) { // Default to true for polish
      const welcomeContainer = ContainerService.create({
        description: messageText,
        color: settings.welcomeInEmbedColor as any || '#7367F0',
        media: ['attachment://welcome-card.png']
      });
      
      await sendV2(channel, welcomeContainer).catch(console.error);
    } else {
      await channel.send({ content: messageText, files: [attachment] }).catch(console.error);
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
