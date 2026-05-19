import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('propose')
       .setDescription('💍 Propose marriage to another user.')
       .addUserOption(opt => 
         opt.setName('user')
            .setDescription('The user you want to propose to')
            .setRequired(true)
       ),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    
    if (targetUser.id === user.id) {
      return await replyV2(interaction, ContainerService.simple('❌ You cannot marry yourself, as much as you might love yourself!'));
    }

    if (targetUser.bot) {
      return await replyV2(interaction, ContainerService.simple('❌ Digital beings cannot yet comprehend the complexities of human marriage.'));
    }

    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check for Divorce Cooldown (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDivorce = await prisma.social_marriage_history.findFirst({
      where: {
        guildId,
        tenantId,
        divorcedAt: { gte: sevenDaysAgo },
        OR: [
          { user1Id: user.id },
          { user2Id: user.id },
          { user1Id: targetUser.id },
          { user2Id: targetUser.id }
        ]
      }
    });

    if (recentDivorce) {
      return await replyV2(interaction, ContainerService.simple('❌ A recent divorce has been recorded for one of the parties. You must wait **7 days** before re-marrying.'));
    }

    // 2. Create a pending marriage entry
    const marriage = await SocialService.proposeMarriage(tenantId, guildId, user.id, targetUser.id);
    
    // Update metadata with proposerId
    await prisma.social_marriages.update({
      where: { id: marriage.id },
      data: { metadata: { proposerId: user.id } }
    });

    const acceptBtn = new ButtonBuilder()
      .setCustomId(`social_marry_accept_${marriage.id}`)
      .setLabel('Accept Proposal')
      .setEmoji('💍')
      .setStyle(ButtonStyle.Success);

    const rejectBtn = new ButtonBuilder()
      .setCustomId(`social_marry_reject_${marriage.id}`)
      .setLabel('Decline')
      .setEmoji('💔')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptBtn, rejectBtn);

    return await replyV2(interaction, ContainerService.create({
      title: '💍 A Grand Proposal',
      description: `${user} has dropped to one knee and asked ${targetUser} for their hand in marriage!\n\nDo you accept this union?`,
      color: '#FF69B4',
      components: [row],
      interaction,
      footer: true,
      thumbnail: targetUser.displayAvatarURL()
    }));
  }
};
