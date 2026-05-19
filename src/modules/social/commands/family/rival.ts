import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('rival')
       .setDescription('⚔️ Declare a rivalry with another family dynasty.')
       .addStringOption(opt => opt.setName('family').setDescription('The name of the family to rival').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetFamilyName = options.getString('family', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check if requester is a head of their family
    const family = await SocialService.getFamilyByMember(user.id);
    if (!family) return await replyV2(interaction, ContainerService.simple('❌ You are not in a family.'));

    const membership = await prisma.social_family_members.findUnique({
      where: { familyId_userId: { familyId: family.id, userId: user.id } }
    });
    if (membership?.role !== 'head') return await replyV2(interaction, ContainerService.simple('❌ Only family heads can declare rivalries.'));

    // 2. Find target family
    const targetFamily = await prisma.social_families.findUnique({
      where: { name_guildId_tenantId: { name: targetFamilyName, guildId, tenantId } }
    });

    if (!targetFamily) return await replyV2(interaction, ContainerService.simple(`❌ Family **${targetFamilyName}** not found in this sector.`));
    if (targetFamily.id === family.id) return await replyV2(interaction, ContainerService.simple('❌ You cannot rival your own family!'));

    const rivalBtn = new ButtonBuilder()
      .setCustomId(`social_family_rival_accept_${family.id}_${targetFamily.id}`)
      .setLabel('Accept Rivalry')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(rivalBtn);

    return await replyV2(interaction, ContainerService.create({
      title: '⚔️ Declaration of Rivalry',
      description: `The **${family.name}** dynasty has challenged the **${targetFamily.name}** family to an official rivalry!\n\nIf accepted, your collective XP gains in contested nations will be tracked weekly. The winner earns regional bonuses.`,
      color: '#E67E22',
      components: [row],
      interaction,
      footer: true
    }));
  }
};
