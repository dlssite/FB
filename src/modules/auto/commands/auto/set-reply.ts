import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { AutoService } from '../../services/AutoService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('set-reply')
       .setDescription('💬 Add a reply to the response roulette.')
       .addStringOption(opt => opt.setName('name').setDescription('The name of the trigger to update').setRequired(true))
       .addStringOption(opt => opt.setName('reply').setDescription('The text to reply with (can be used multiple times to add variants)').setRequired(true))
       .addStringOption(opt => opt.setName('media_url').setDescription('Optional URL for an image/gif').setRequired(false))
       .addBooleanOption(opt => opt.setName('use_embed').setDescription('Wrap the response in a rich embed container?').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const name = interaction.options.getString('name', true);
    const replyText = interaction.options.getString('reply', true);
    const mediaUrl = interaction.options.getString('media_url');
    const useEmbed = interaction.options.getBoolean('use_embed');

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

    // Append to roulette array
    const updatedTexts = [...(trigger.replyTexts as string[]), replyText];

    const updateData: any = { replyTexts: updatedTexts };
    if (mediaUrl !== null) updateData.replyMedia = mediaUrl;
    if (useEmbed !== null) updateData.useEmbed = useEmbed;

    await prisma.auto_triggers.update({
      where: { id: trigger.id },
      data: updateData
    });

    AutoService.clearCache(context.guildId);

    const container = ContainerService.create({
      title: '💬 Response Roulette Updated',
      description: `Added a new variant to **${name}**.\n\nIt now has **${updatedTexts.length}** possible responses.`,
      fields: [
        { name: 'Added Reply', value: replyText.substring(0, 1024) }
      ],
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
