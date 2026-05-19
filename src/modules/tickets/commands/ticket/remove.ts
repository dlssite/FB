import { ChatInputCommandInteraction, TextChannel, MessageFlags } from 'discord.js';
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

  const user = interaction.options.getUser('user', true);
  await TicketService.removeUser(interaction.channel as TextChannel, user.id);
  
  const successContainer = ContainerService.create({ title: 'User Removed', description: `✅ <@${user.id}> was removed from the ticket.`, color: '#28C76F', footer: true });
  return await replyV2(interaction, successContainer);
}
