import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('kick')
       .setDescription('👞 Remove a member from your family dynasty.')
       .addUserOption(opt => opt.setName('user').setDescription('The member to kick').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check if requester is a head
    const family = await SocialService.getFamilyByMember(user.id);
    if (!family) return await replyV2(interaction, ContainerService.simple('❌ You are not in a family.'));

    const requesterMembership = await prisma.social_family_members.findUnique({
      where: { familyId_userId: { familyId: family.id, userId: user.id } }
    });
    if (requesterMembership?.role !== 'head') return await replyV2(interaction, ContainerService.simple('❌ Only family heads can kick members.'));

    // 2. Check if target is in the same family
    const targetMembership = await prisma.social_family_members.findUnique({
      where: { familyId_userId: { familyId: family.id, userId: targetUser.id } }
    });

    if (!targetMembership) return await replyV2(interaction, ContainerService.simple('❌ This user is not a member of your family.'));
    if (targetMembership.role === 'head' && user.id !== family.head1Id) {
       return await replyV2(interaction, ContainerService.simple('❌ You cannot kick a co-head. Only the founder can dissolve leadership.'));
    }

    // 3. Kick and remove role
    await prisma.social_family_members.delete({ where: { id: targetMembership.id } });
    await SocialService.removeFamilyRole(interaction.guild, family.name, targetUser.id);

    return await replyV2(interaction, ContainerService.create({
      title: '👞 Member Exiled',
      description: `${targetUser} has been removed from the **${family.name}** dynasty.`,
      color: '#E74C3C',
      interaction,
      footer: true
    }));
  }
};
