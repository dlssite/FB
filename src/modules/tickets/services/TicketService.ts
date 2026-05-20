import { GuildMember, TextChannel, ChannelType, PermissionFlagsBits, CategoryChannel, Collection, Message } from 'discord.js';
import { prisma } from '../../../database/client';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';
import { ContainerService, sendV2 } from '../../../utils/container';
import { TranscriptBuilder } from './TranscriptBuilder';

export class TicketService {
  /**
   * Opens a new ticket for a user based on a specific config option.
   */
  static async openTicket(member: GuildMember, configId: string) {
    const tenantId = flamebornConfig.bot.tenant.id;
    
    // Fetch Config
    const config = await prisma.ticket_configs.findUnique({
      where: { id: parseInt(configId, 10) }
    });

    if (!config || config.tenantId !== tenantId) {
      throw new Error('Invalid ticket configuration.');
    }

    // Check if user already has an open ticket of this type
    const existing = await prisma.tickets.findFirst({
      where: {
        userId: member.id,
        tenantId,
        ticketConfigId: configId,
        status: 'open'
      }
    });

    if (existing) {
      throw new Error(`You already have an open ticket for **${config.typeName}**!`);
    }

    // Determine category
    let parentId: string | undefined = config.ticketCategoryId || undefined;
    if (parentId) {
      const category = await member.guild.channels.fetch(parentId).catch(() => null);
      if (!category || category.type !== ChannelType.GuildCategory) {
        parentId = undefined;
      }
    }

    const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    // Permission Overwrites: Deny everyone, Allow Member, Allow Staff, Allow Bot
    const permissionOverwrites = [
      {
        id: member.guild.roles.everyone.id,
        deny: ['ViewChannel' as any]
      },
      {
        id: member.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] as any
      },
      {
        id: config.staffRoleId,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'ManageMessages'] as any
      },
      {
        id: member.client.user.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels', 'ManageRoles'] as any
      }
    ];

    // Create Channel
    const channel = await member.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites
    });

    // Save to Database
    const ticket = await prisma.tickets.create({
      data: {
        guildId: member.guild.id,
        tenantId,
        userId: member.id,
        channelId: channel.id,
        ticketConfigId: configId,
        status: 'open',
        openedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Send Welcome Container
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close_${ticket.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    const welcomeMsg = config.ticketOpenMessage || `Hello <@${member.id}>,\n\nSupport will be with you shortly. Please describe your issue in detail.`;

    const container = ContainerService.create({
      title: `${config.typeEmoji ? config.typeEmoji + ' ' : ''}${config.typeName} Ticket`,
      description: welcomeMsg,
      image: flamebornConfig.tickets.assets.openBanner,
      color: '#ff79c6',
      footer: true,
      components: [row]
    });

    await channel.send({ content: `<@${member.id}> | <@&${config.staffRoleId}>` }); // Ping user and staff outside embed
    await sendV2(channel, container);

    return channel;
  }

  /**
   * Closes a ticket, generates transcript, and deletes channel.
   */
  static async closeTicket(channel: TextChannel, closerId: string, reason?: string) {
    const tenantId = flamebornConfig.bot.tenant.id;
    
    const ticket = await prisma.tickets.findFirst({
      where: { channelId: channel.id, tenantId, status: 'open' }
    });

    if (!ticket) throw new Error('Ticket not found in database or already closed.');

    const config = await prisma.ticket_configs.findUnique({
      where: { id: parseInt(ticket.ticketConfigId, 10) }
    });

    if (!config) throw new Error('Ticket configuration missing.');

    // Update status to prevent double-closes
    await prisma.tickets.update({
      where: { id: ticket.id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        closedByUserId: closerId,
        closedReason: reason || 'No reason provided.',
        updatedAt: new Date()
      }
    });

    try {
      // 1. Fetch Messages
      const messages = await this.fetchAllMessages(channel);
      
      // 2. Build Transcript
      const html = await TranscriptBuilder.generate(messages, channel.name, ticket.id.toString());
      const buffer = Buffer.from(html, 'utf-8');

      // 3. Send to Transcript Logs
      const logChannel = await channel.guild.channels.fetch(config.transcriptChannelId).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const { AttachmentBuilder } = await import('discord.js');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });
        
        await logChannel.send({
          content: `**Ticket Closed:** #${ticket.id}\n**Opened By:** <@${ticket.userId}>\n**Closed By:** <@${closerId}>\n**Reason:** ${reason || 'N/A'}`,
          files: [attachment]
        });
      }

      // 4. DM User the Transcript
      const user = await channel.client.users.fetch(ticket.userId).catch(() => null);
      if (user) {
        const { AttachmentBuilder } = await import('discord.js');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });
        await user.send({
          content: `Your ticket **${channel.name}** has been closed by <@${closerId}>.\n**Reason:** ${reason || 'N/A'}\n\nA copy of your transcript is attached.`,
          files: [attachment]
        }).catch(() => {
           Logger.warn(`Failed to DM transcript to user ${ticket.userId}`);
        });
      }

    } catch (err) {
      Logger.error(`Failed to generate transcript for ticket ${ticket.id}`, err);
    }

    // 5. Delete Channel
    setTimeout(() => {
      channel.delete('Ticket closed').catch(() => {});
    }, 5000); // 5 second buffer so the user sees it's closing before it vanishes
  }

  /**
   * Adds a user to an active ticket channel.
   */
  static async addUser(channel: TextChannel, userId: string) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true
    });
  }

  /**
   * Removes a user from an active ticket channel.
   */
  static async removeUser(channel: TextChannel, userId: string) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: false
    });
  }

  /**
   * Utility to fetch up to 400 messages from a channel for transcripts.
   */
  private static async fetchAllMessages(channel: TextChannel): Promise<Message[]> {
    let messages: Message[] = [];
    let lastId: string | undefined = undefined;

    while (messages.length < 400) {
      const options: any = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await channel.messages.fetch(options) as any;
      if (batch.size === 0) break;

      messages = messages.concat(Array.from(batch.values()));
      lastId = batch.last()?.id;
    }

    return messages.reverse(); // Chronological order
  }
}
