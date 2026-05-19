import { Interaction, MessageFlags, StringSelectMenuInteraction, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { TicketService } from '../services/TicketService';
import { replyV2, ContainerService } from '../../../utils/container';
import { EmbedService } from '../../../utils/embed';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.guild) return;

    // Handle Dropdown Select for creating tickets
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_panel_select_')) {
      await interaction.deferReply({ flags: (MessageFlags.IsComponentsV2 as any || 32768) | (MessageFlags.Ephemeral as any || 64) });
      
      const configId = interaction.values[0];

      try {
        const channel = await TicketService.openTicket(interaction.member as any, configId);
        const container = ContainerService.create({
          title: 'Ticket Created',
          description: `✅ Your ticket has been created successfully.`,
          color: '#28C76F',
          footer: true,
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder().setLabel('View Ticket').setStyle(ButtonStyle.Link).setURL(channel.url)
            )
          ]
        });
        return await replyV2(interaction, container);
      } catch (err: any) {
        Logger.error('Ticket Creation Error', err);
        const errorContainer = EmbedService.containerError(err.message || 'An error occurred creating your ticket.', 'TICKET_CREATE_ERR');
        return await replyV2(interaction, errorContainer);
      }
    }

    // Handle "Close Ticket" Button inside the ticket
    if (interaction.isButton() && interaction.customId.startsWith('ticket_close_')) {
      await interaction.deferReply();
      
      try {
        const container = ContainerService.create({
          title: 'Closing Ticket',
          description: `🔒 Ticket is being closed by <@${interaction.user.id}>...`,
          color: '#ff79c6',
          footer: true
        });
        await replyV2(interaction, container);
        await TicketService.closeTicket(interaction.channel as any, interaction.user.id, 'Closed via Button');
      } catch (err: any) {
        const errorContainer = EmbedService.containerError(err.message || 'An error occurred closing the ticket.', 'TICKET_CLOSE_ERR');
        return await replyV2(interaction, errorContainer);
      }
    }
  }
};
