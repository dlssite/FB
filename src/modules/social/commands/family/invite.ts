import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';
import { SocialService } from '../../services/SocialService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('invite')
       .setDescription('👨‍👩‍👧‍👦 Invite a user to join your family dynasty.')
       .addUserOption(opt => 
         opt.setName('user')
            .setDescription('The user you want to invite')
            .setRequired(true)
       ),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    
    if (targetUser.id === user.id) {
      return await replyV2(interaction, ContainerService.simple('❌ You are already in your own family (hopefully).'));
    }

    if (targetUser.bot) {
      return await replyV2(interaction, ContainerService.simple('❌ Bots cannot carry on a family legacy... yet.'));
    }

    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check if sender is a family head
    const senderMembership = await prisma.social_family_members.findFirst({
      where: { userId: user.id, role: 'head' }
    });

    if (!senderMembership) {
      return await replyV2(interaction, ContainerService.simple('❌ Only family heads can invite new members to the dynasty.'));
    }

    const family = await prisma.social_families.findUnique({
      where: { id: senderMembership.familyId }
    });

    // 2. Check if target is already in a family
    const targetExisting = await SocialService.getFamilyByMember(targetUser.id);
    if (targetExisting) {
      return await replyV2(interaction, ContainerService.simple('❌ This user is already part of a family dynasty.'));
    }

    // 3. Create pending invitation
    await prisma.social_family_members.upsert({
      where: { familyId_userId: { familyId: family!.id, userId: targetUser.id } },
      update: { status: 'pending' },
      create: { familyId: family!.id, userId: targetUser.id, role: 'member', status: 'pending' }
    });

    // 4. Notify
    await targetUser.send(`👨‍👩‍👧‍👦 **Family Invitation!**\nYou have been invited to join the **${family!.name}** dynasty in **${interaction.guild.name}**.\nUse \`/social inbox\` to accept!`).catch(() => {});

    return await replyV2(interaction, ContainerService.create({
      title: '👨‍👩‍👧‍👦 Invitation Sent',
      description: `You have invited ${targetUser} to join the **${family!.name}** legacy.\n\nThey have been notified via DM and can accept the invite in their social inbox.`,
      color: '#F1C40F',
      interaction,
      footer: true
    }));
  }
};
