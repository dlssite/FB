import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('treasury')
       .setDescription('💰 Donate embers to your family treasury.')
       .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to donate').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const amount = BigInt(options.getInteger('amount', true));
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    if (amount <= 0n) return await replyV2(interaction, ContainerService.simple('❌ Donation must be positive.'));

    const family = await SocialService.getFamilyByMember(user.id);
    if (!family) return await replyV2(interaction, ContainerService.simple('❌ You are not in a family.'));

    const fbUser = await prisma.flameborn_users.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } });
    if (!fbUser || (fbUser.embers || 0n) < amount) return await replyV2(interaction, ContainerService.simple('❌ Insufficient balance.'));

    await prisma.$transaction([
      prisma.flameborn_users.update({ where: { userId_tenantId: { userId: user.id, tenantId } }, data: { embers: { decrement: amount } } }),
      prisma.social_families.update({ where: { id: family.id }, data: { treasuryBalance: { increment: amount } } })
    ]);

    return await replyV2(interaction, ContainerService.create({
      title: '💰 Treasury Donation',
      description: `You donated **${Number(amount).toLocaleString()}** Embers to the **${family.name}** treasury.\n\nYour dynasty grows stronger with every contribution.`,
      color: '#F1C40F',
      interaction,
      footer: true
    }));
  }
};
