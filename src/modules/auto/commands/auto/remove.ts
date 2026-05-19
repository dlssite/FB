import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { AutoService } from '../../services/AutoService';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('remove')
       .setDescription('🗑️ Delete an automated response trigger.')
       .addStringOption(opt => opt.setName('name').setDescription('The name of the trigger to delete').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const name = interaction.options.getString('name', true);

    const trigger = await prisma.auto_triggers.findFirst({
      where: { tenantId: context.tenantId, guildId: context.guildId, name }
    });

    if (!trigger) {
      return await interaction.editReply(
        ContainerService.simple(`❌ No trigger found with the name **${name}**.`) as any
      );
    }

    await prisma.auto_triggers.delete({
      where: { id: trigger.id }
    });

    AutoService.clearCache(context.guildId);

    const container = ContainerService.create({
      title: '🗑️ Trigger Deleted',
      description: `Successfully removed **${name}** and all associated actions from the action engine.`,
      color: '#EA5455',
      footer: true,
      interaction
    });

    await interaction.editReply(container as any);
  }
};
