import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('found')
       .setDescription('👨‍👩‍👧‍👦 Found a new family dynasty.')
       .addStringOption(opt => 
         opt.setName('name')
            .setDescription('The name of your new family')
            .setRequired(true)
       ),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const name = options.getString('name', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check if user is married
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
      return await replyV2(interaction, ContainerService.simple('❌ You must be married to found a formal family dynasty.'));
    }

    // 2. Check if user is already in a family
    const existingFamily = await SocialService.getFamilyByMember(user.id);
    if (existingFamily) {
      return await replyV2(interaction, ContainerService.simple(`❌ You are already a member of the **${existingFamily.name}** family.`));
    }

    // 3. Founding fee (e.g. 50,000 embers)
    const foundingFee = 50000n;
    const fbUser = await prisma.flameborn_users.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } }
    });

    if (!fbUser || (fbUser.embers || 0n) < foundingFee) {
      return await replyV2(interaction, ContainerService.simple(`❌ Founding a dynasty requires a fee of **${Number(foundingFee).toLocaleString()}** Embers.`));
    }

    // Deduct fee
    await prisma.flameborn_users.update({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      data: { embers: { decrement: foundingFee } }
    });

    const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;

    // 4. Create Family
    const family = await SocialService.foundFamily(tenantId, guildId, name, user.id, partnerId);

    // Auto-Role Sync
    await SocialService.syncFamilyRole(interaction.guild, family.name, user.id);
    await SocialService.syncFamilyRole(interaction.guild, family.name, partnerId);

    return await replyV2(interaction, ContainerService.create({
      title: '👨‍👩‍👧‍👦 Dynasty Established',
      description: `The **${family.name}** family has been officially founded by ${user} and their partner!\n\nYour legacy begins today. Invite others to grow your influence.`,
      color: '#F1C40F',
      interaction,
      footer: true
    }));
  }
};
