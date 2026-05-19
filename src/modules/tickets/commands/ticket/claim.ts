import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../../../database/client';
import { flamebornConfig } from '../../../../config/flameborn.config';
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

  const successContainer = ContainerService.create({ 
    title: 'Ticket Claimed', 
    description: `👋 <@${interaction.user.id}> will be handling this ticket.`, 
    color: '#ff79c6', 
    footer: true 
  });
  return await replyV2(interaction, successContainer);
}
