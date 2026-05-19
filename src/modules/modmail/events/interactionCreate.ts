import { ButtonInteraction, ModalSubmitInteraction, StringSelectMenuInteraction, MessageFlags, ThreadChannel, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { ModmailRepository } from '../database/ModmailRepository';
import { ModmailService } from '../services/ModmailService';
import { RoutingService } from '../../../services/RoutingService';
import { Logger } from '../../../utils/logger';
import { ContainerService, replyV2, sendV2 } from '../../../utils/container';

export default {
  name: 'interactionCreate',
  async execute(interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction) {
    try {
      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('modmail_claim_')) {
          // Defer reply immediately to satisfy the 3-second Discord threshold
          await interaction.deferReply();

          const ticketId = parseInt(customId.replace('modmail_claim_', ''));
          const guildId = interaction.guildId;
          if (!guildId) return;
          const tenantId = await RoutingService.resolveTenantId(guildId, 'modmail');

          const ticket = await ModmailRepository.getTicketByThread(tenantId, interaction.channelId!);
          if (!ticket || ticket.status === 'closed') {
            return await replyV2(interaction, ContainerService.simple('❌ Invalid ticket.', { color: '#EA5455' }));
          }

          if (ticket.claimedById) {
            return await replyV2(interaction, ContainerService.simple('⚠️ Already claimed.', { color: '#FF9F43' }));
          }

          await ModmailRepository.updateTicket(tenantId, ticketId, { claimedById: interaction.user.id, status: 'claimed' });
          await replyV2(interaction, ContainerService.create({
            title: '✅ Ticket Claimed',
            description: `This ticket has been successfully claimed by <@${interaction.user.id}>.`,
            color: '#28C76F',
            footer: true
          }));

        } else if (customId.startsWith('modmail_close_')) {
          // Defer reply immediately to satisfy the 3-second Discord threshold
          await interaction.deferReply();

          const ticketId = parseInt(customId.replace('modmail_close_', ''));
          const guildId = interaction.guildId;
          if (!guildId) return;
          const tenantId = await RoutingService.resolveTenantId(guildId, 'modmail');

          const ticket = await ModmailRepository.getTicketByThread(tenantId, interaction.channelId!);
          if (!ticket || ticket.status === 'closed') {
            return await replyV2(interaction, ContainerService.simple('❌ Invalid ticket.', { color: '#EA5455' }));
          }

          await ModmailRepository.updateTicket(tenantId, ticketId, { status: 'closed', closedAt: new Date() });
          await ModmailService.sendCSATPrompt(interaction.client, ticket);
          await replyV2(interaction, ContainerService.create({
            title: '🔒 Ticket Closed',
            description: `This ticket has been closed by <@${interaction.user.id}>.`,
            color: '#EA5455',
            footer: true
          }));
          
          setTimeout(async () => {
            const thread = interaction.channel as ThreadChannel;
            if (thread && thread.setArchived) {
              await thread.setArchived(true).catch(() => {});
            }
          }, 3000);

        } else if (customId.startsWith('modmail_reply_btn_')) {
          const ticketId = parseInt(customId.replace('modmail_reply_btn_', ''));
          
          // Show Modal IMMEDIATELY and SYNCHRONOUSLY to prevent any possible Unknown Interaction timeout.
          // Database ticket and claim state validations are executed during modal submission.
          const modal = new ModalBuilder()
            .setCustomId(`modmail_reply_modal_${ticketId}`)
            .setTitle('Reply to User');

          const msgInput = new TextInputBuilder()
            .setCustomId('reply_message')
            .setLabel('Your Message')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          const identityInput = new TextInputBuilder()
            .setCustomId('reply_identity')
            .setLabel('Identity (Optional e.g. "Staff Member")')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(msgInput);
          const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(identityInput);
          
          modal.addComponents(firstRow, secondRow);
          
          await interaction.showModal(modal);

        } else if (customId.startsWith('modmail_csat_')) {
          // Format: modmail_csat_{ticketId}_{rating}
          const parts = customId.split('_');
          const ticketId = parseInt(parts[2]);
          const rating = parseInt(parts[3]);

          // Defer reply immediately to satisfy the 3-second Discord threshold
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          // No context here because this happens in DM. We query direct.
          const { prisma } = require('../../../database/client');
          
          const ticket = await prisma.modmail_tickets.findUnique({ where: { id: ticketId } });
          if (!ticket) return;

          if (ticket.rating) {
            return await replyV2(interaction, ContainerService.simple('⚠️ You have already rated this ticket.', { color: '#FF9F43' }), true);
          }

          await prisma.modmail_tickets.update({
            where: { id: ticketId },
            data: { rating }
          });

          await replyV2(interaction, ContainerService.simple(`✅ Thank you! You rated the support **${rating} ⭐**.`, { color: '#28C76F' }), true);
          
          // Send rating notification to the ticket thread
          if (ticket.threadId && ticket.guildId) {
             const guild = await interaction.client.guilds.fetch(ticket.guildId).catch(() => null);
             if (guild) {
                const thread = await guild.channels.fetch(ticket.threadId).catch(() => null);
                if (thread && thread.isThread()) {
                   await sendV2(thread, ContainerService.create({
                      title: '⭐ Support Feedback Received',
                      description: `The user has rated the support received for this ticket:\n\nRating: **${rating} / 5 ⭐**`,
                      color: '#FFD700',
                      footer: true
                   })).catch((err) => {
                      Logger.error(`[MODMAIL] Failed to send rating feedback to thread ${ticket.threadId}:`, err);
                   });
                }
             }
          }

          // Update original CSAT message to remove buttons
          await interaction.message.edit({ components: [] }).catch(() => {});
        }
      } else if (interaction.isModalSubmit()) {
        const customId = interaction.customId;
        if (customId.startsWith('modmail_reply_modal_')) {
          // Defer reply immediately
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const ticketId = parseInt(customId.replace('modmail_reply_modal_', ''));
          const guildId = interaction.guildId;
          if (!guildId) return;
          const tenantId = await RoutingService.resolveTenantId(guildId, 'modmail');

          const message = interaction.fields.getTextInputValue('reply_message');
          const identityOpt = interaction.fields.getTextInputValue('reply_identity');

          // Execute database validation checks inside the deferred submit state
          const ticket = await ModmailRepository.getTicketByThread(tenantId, interaction.channelId!);
          if (!ticket || ticket.status === 'closed') {
            return await replyV2(interaction, ContainerService.simple('❌ Invalid ticket.', { color: '#EA5455' }), true);
          }

          if (ticket.claimedById && ticket.claimedById !== interaction.user.id) {
            return await replyV2(interaction, ContainerService.simple(`❌ Claimed by <@${ticket.claimedById}>.`, { color: '#EA5455' }), true);
          }

          const maskedIdentity = identityOpt && identityOpt.trim() !== '' ? identityOpt : null;

          await ModmailService.handleOutgoingModMessage(interaction.client, ticket, interaction.user, message, maskedIdentity);
          await replyV2(interaction, ContainerService.simple('✅ Reply sent successfully.', { color: '#28C76F' }), true);
        }
      } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'modmail_server_select') {
          const selectedValue = interaction.values[0];
          const [tenantId, guildId] = selectedValue.split('_');

          // Extract the original message content from the embed description
          const originalEmbed = (interaction.message.components as any[])?.[0]?.components?.[0] as any;
          let content = 'No content found';
          
          if (originalEmbed && originalEmbed.data?.content) {
             const matches = originalEmbed.data.content.match(/> \*"(.+)"\*/s);
             if (matches && matches[1]) {
                content = matches[1].replace(/\.\.\.$/, ''); // Remove trailing ellipsis if exists
             }
          }

          await interaction.deferUpdate();
          await interaction.message.edit({ components: [] }).catch(() => {});

          const success = await ModmailService.handleIncomingUserMessage(
            interaction.client,
            interaction.user,
            content,
            guildId,
            tenantId
          );

          if (success) {
            await interaction.followUp({ content: '✅ Your message has been sent to the selected server.', flags: MessageFlags.Ephemeral });
          } else {
            await interaction.followUp({ content: '❌ Failed to create a ticket for the selected server. It may be disabled.', flags: MessageFlags.Ephemeral });
          }
        }
      }
    } catch (err) {
      Logger.error(`[MODMAIL] Interaction error:`, err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await replyV2(interaction, ContainerService.simple('❌ An error occurred while processing this interaction.', { color: '#EA5455' }), true);
        } else if (interaction.deferred) {
          await replyV2(interaction, ContainerService.simple('❌ An error occurred while processing this interaction.', { color: '#EA5455' }), true);
        }
      } catch (_) {}
    }
  }
};
