import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ThreadChannel } from 'discord.js';
import { ModmailRepository } from '../../database/ModmailRepository';
import { ModmailService } from '../../services/ModmailService';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('close')
       .setDescription('Close this Modmail ticket')
       .addStringOption(opt => opt.setName('reason').setDescription('Optional reason for closing').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    if (!interaction.channel?.isThread()) {
      const container = ContainerService.simple('❌ You must use this command inside a Modmail thread.', { color: '#E74C3C' });
      return await replyV2(interaction, container);
    }

    const ticket = await ModmailRepository.getTicketByThread(context.tenantId, interaction.channel.id);
    if (!ticket || ticket.status === 'closed') {
      const container = ContainerService.simple('❌ This thread is not an active Modmail ticket.', { color: '#E74C3C' });
      return await replyV2(interaction, container);
    }

    // Close in DB
    await ModmailRepository.updateTicket(context.tenantId, ticket.id, { status: 'closed', closedAt: new Date() });

    // Send CSAT to user
    await ModmailService.sendCSATPrompt(interaction.client, ticket);

    // Archive thread
    const container = ContainerService.simple(`🔒 Ticket closed by <@${interaction.user.id}>. A rating prompt has been sent to the user.`, { color: '#95A5A6' });
    await replyV2(interaction, container);
    
    setTimeout(async () => {
      const thread = interaction.channel as ThreadChannel;
      await thread.setArchived(true, 'Ticket Closed').catch(() => {});
    }, 5000);
  }
};
