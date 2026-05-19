import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('remove')
       .setDescription('🗑️ Remove your birthday record from this server.'),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const existing = await prisma.user_birthdays.findFirst({
      where: { 
        tenantId: context.tenantId, 
        guildId: context.guildId, 
        userId: interaction.user.id 
      }
    });

    if (!existing) {
      return replyV2(interaction, ContainerService.simple("❌ You don't have a birthday set in this server."));
    }

    await prisma.user_birthdays.delete({
      where: { id: existing.id }
    });

    await replyV2(interaction, ContainerService.simple('🗑️ Your birthday record has been successfully removed.', { color: '#EA5455' }));
  }
};
