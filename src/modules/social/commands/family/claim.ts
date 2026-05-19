import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('claim')
       .setDescription('🚩 Initiate a territory claim for a nation.')
       .addIntegerOption(opt => opt.setName('nation').setDescription('The ID of the nation to claim').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const nationId = options.getInteger('nation', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check if requester is a head
    const family = await SocialService.getFamilyByMember(user.id);
    if (!family) return await replyV2(interaction, ContainerService.simple('❌ You are not in a family.'));

    const membership = await prisma.social_family_members.findUnique({
      where: { familyId_userId: { familyId: family.id, userId: user.id } }
    });
    if (membership?.role !== 'head') return await replyV2(interaction, ContainerService.simple('❌ Only family heads can initiate territory claims.'));

    // 2. Check if nation exists
    const nation = await prisma.territory_nations.findUnique({ where: { id: nationId } });
    if (!nation) return await replyV2(interaction, ContainerService.simple('❌ This nation does not exist.'));

    // 3. Initiate Vote
    const voteBtn = new ButtonBuilder()
      .setCustomId(`social_family_vote_claim_${family.id}_${nationId}`)
      .setLabel('Vote YES')
      .setEmoji('🚩')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(voteBtn);

    return await replyV2(interaction, ContainerService.create({
      title: '🚩 Territory Claim Vote',
      description: `${user} has proposed that the **${family.name}** dynasty claim **${nation.name}** as home territory.\n\nFamily members, please cast your vote. A majority is required to finalize the claim.`,
      color: '#F1C40F',
      components: [row],
      interaction,
      footer: true
    }));
  }
};
