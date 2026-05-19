import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('divorce')
       .setDescription('💔 End your current marriage.'),

  async execute(interaction: any) {
    const { guildId, user } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const marriage = await prisma.social_marriages.findFirst({
      where: {
        guildId,
        tenantId,
        status: 'married',
        OR: [
          { user1Id: user.id },
          { user2Id: user.id }
        ]
      }
    });

    if (!marriage) {
      return await replyV2(interaction, ContainerService.simple('❌ You are not currently joined in marriage.'));
    }

    const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;

    const confirmBtn = new ButtonBuilder()
      .setCustomId(`social_marry_divorce_confirm_${marriage.id}`)
      .setLabel('Confirm Divorce')
      .setEmoji('💔')
      .setStyle(ButtonStyle.Danger);

    const cancelBtn = new ButtonBuilder()
      .setCustomId(`social_marry_divorce_cancel_${marriage.id}`)
      .setLabel('Reconsider')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

    return await replyV2(interaction, ContainerService.create({
      title: '💔 Initiate Divorce',
      description: `You are about to initiate a divorce from your partner <@${partnerId}>.\n\n**Warning:** This will reset your resonance score and split any joint assets. Both partners must eventually confirm or the request will expire.`,
      color: '#E74C3C',
      components: [row],
      interaction,
      footer: true
    }));
  }
};
