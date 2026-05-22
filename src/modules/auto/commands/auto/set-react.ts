import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { AutoService } from '../../services/AutoService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('set-react')
       .setDescription('😊 Add a reaction to this trigger.')
       .addStringOption(opt => opt.setName('name').setDescription('The name of the trigger to update').setRequired(true))
       .addStringOption(opt => opt.setName('emoji').setDescription('The emoji to react with').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const name = interaction.options.getString('name', true);
    const emoji = interaction.options.getString('emoji', true);

    const trigger = await prisma.auto_triggers.findFirst({
      where: { tenantId: context.tenantId, guildId: context.guildId, name }
    });

    if (!trigger) {
      return await replyV2(interaction,
        ContainerService.create({
          title: '❌ Error',
          description: `No trigger found with the name **${name}**.`,
          color: '#EA5455',
          footer: true,
          interaction
        })
      );
    }

    // Append to reactions array
    const updatedReactions = [...(trigger.reactions as string[]), emoji];

    await prisma.auto_triggers.update({
      where: { id: trigger.id },
      data: { reactions: updatedReactions }
    });

    AutoService.clearCache(context.guildId);

    const container = ContainerService.create({
      title: '😊 Reaction Added',
      description: `Successfully added ${emoji} to **${name}**.\n\nThis trigger now executes **${updatedReactions.length}** reactions.`,
      color: '#FFB600',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
