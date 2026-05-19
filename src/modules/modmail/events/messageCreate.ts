import { Message, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { ModmailService } from '../services/ModmailService';
import { prisma } from '../../../database/client';
import { ContainerService } from '../../../utils/container';

export default {
  name: 'messageCreate',
  async execute(message: Message) {
    if (message.author.bot) return;

    // Only intercept DMs
    if (message.channel.type !== ChannelType.DM) return;

    // FBT is multi-tenant. Since this is a DM, we need to find which guild the user wants to contact.
    // If they already have an active ticket, route to that.
    const activeTickets = await prisma.modmail_tickets.findMany({
      where: {
        userId: message.author.id,
        status: { not: 'closed' }
      }
    });

    if (activeTickets.length > 0) {
      const ticket = activeTickets[0];
      await ModmailService.handleIncomingUserMessage(
        message.client,
        message.author,
        message.content,
        ticket.guildId,
        ticket.tenantId
      );
      return;
    }

    // No active ticket. Find mutual guilds.
    const mutualGuildIds: string[] = [];
    for (const [guildId, guild] of message.client.guilds.cache) {
      if (guild.members.cache.has(message.author.id)) {
        mutualGuildIds.push(guildId);
        continue;
      }
      try {
        const member = await guild.members.fetch(message.author.id);
        if (member) {
          mutualGuildIds.push(guildId);
        }
      } catch (_) {}
    }

    if (mutualGuildIds.length === 0) {
      await message.author.send('❌ I could not find a mutual server with an active Modmail system.').catch(() => {});
      return;
    }

    // Query DB ONCE for all mutual guilds
    const activeSettings = await prisma.modmail_settings.findMany({
      where: {
        guildId: { in: mutualGuildIds },
        enabled: true
      }
    });

    if (activeSettings.length === 0) {
      await message.author.send('❌ I could not find a mutual server with an active Modmail system. Please use the `/modmail contact` command inside the server instead.').catch(() => {});
      return;
    }

    if (activeSettings.length === 1) {
      // Exactly one enabled server
      const settings = activeSettings[0];
      await ModmailService.handleIncomingUserMessage(
        message.client,
        message.author,
        message.content,
        settings.guildId,
        settings.tenantId
      );
      return;
    }

    // Multiple servers enabled - Ask user to select
    const options = activeSettings.slice(0, 25).map(settings => {
      const guild = message.client.guilds.cache.get(settings.guildId);
      return {
        label: guild ? guild.name.substring(0, 100) : 'Unknown Server',
        description: `ID: ${settings.guildId}`,
        value: `${settings.tenantId}_${settings.guildId}`
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('modmail_server_select')
      .setPlaceholder('Select a server to contact')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const embedPayload = ContainerService.create({
      title: '📬 Choose Server',
      description: `**Which server's staff would you like to contact?**\n\nYou share multiple servers with me that have Modmail enabled. Please select the server below to send your message:\n\n> *"${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}"*`,
      color: '#3498db',
      components: [row],
      footer: true
    });

    await message.author.send(embedPayload as any).catch(() => {});
  }
};
