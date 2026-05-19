import { ChatInputCommandInteraction, MessageFlags, TextChannel } from 'discord.js';
import { prisma } from '../../../../database/client';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { TicketService } from '../../services/TicketService';
import { replyV2, ContainerService } from '../../../../utils/container';

export async function execute(interaction: ChatInputCommandInteraction) {
  const tenantId = flamebornConfig.bot.tenant.id;
  const ticket = await prisma.tickets.findFirst({
    where: { channelId: interaction.channelId, tenantId, status: 'open' }
  });

  if (!ticket) {
    const errorContainer = ContainerService.create({ title: 'Invalid Action', description: '❌ This command can only be used inside an active ticket.', color: '#EA5455', footer: true });
    return await replyV2(interaction, errorContainer);
  }

  const reason = interaction.options.getString('reason') || 'Resolved.';
  const successContainer = ContainerService.create({ 
    title: 'Closing Ticket', 
    description: `🔒 Ticket is being closed by <@${interaction.user.id}>...`, 
    color: '#ff79c6', 
    footer: true 
  });
  await replyV2(interaction, successContainer);
  await TicketService.closeTicket(interaction.channel as TextChannel, interaction.user.id, reason);
}
