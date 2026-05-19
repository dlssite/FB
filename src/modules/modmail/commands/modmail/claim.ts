import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModmailRepository } from '../../database/ModmailRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('claim')
       .setDescription('Claim this ticket so only you can reply'),

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

    if (ticket.claimedById) {
       if (ticket.claimedById === interaction.user.id) {
          const container = ContainerService.simple('⚠️ You already claimed this ticket.', { color: '#F1C40F' });
          return await replyV2(interaction, container);
       }
       const container = ContainerService.simple(`❌ This ticket is already claimed by <@${ticket.claimedById}>.`, { color: '#E74C3C' });
       return await replyV2(interaction, container);
    }

    await ModmailRepository.updateTicket(context.tenantId, ticket.id, { claimedById: interaction.user.id, status: 'claimed' });
    const container = ContainerService.simple(`✅ Ticket claimed by <@${interaction.user.id}>. Other moderators can no longer reply unless unclaimed.`, { color: '#2ECC71' });
    await replyV2(interaction, container);
  }
};
