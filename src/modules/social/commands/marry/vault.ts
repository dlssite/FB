import { SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  isGroup: true,
  data: (group: SlashCommandSubcommandGroupBuilder) => 
    group.setName('vault')
         .setDescription('🏦 Manage your joint marriage vault.')
         .addSubcommand(sub => 
           sub.setName('deposit')
              .setDescription('Deposit embers into the joint vault.')
              .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true))
         )
         .addSubcommand(sub => 
           sub.setName('withdraw')
              .setDescription('Withdraw embers from the joint vault.')
              .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true))
         ),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const sub = options.getSubcommand();
    const amount = BigInt(options.getInteger('amount', true));
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    if (amount <= 0n) return await replyV2(interaction, ContainerService.simple('❌ Amount must be positive.'));

    const marriage = await prisma.social_marriages.findFirst({
      where: {
        guildId,
        tenantId,
        status: 'married',
        OR: [{ user1Id: user.id }, { user2Id: user.id }]
      }
    });

    if (!marriage) return await replyV2(interaction, ContainerService.simple('❌ You must be married to use a joint vault.'));

    if (marriage.resonanceScore < 100) {
      return await replyV2(interaction, ContainerService.simple('❌ Your union has not yet reached the **Bonded** tier (100 Resonance) required to unlock a joint vault.'));
    }

    if (sub === 'deposit') {
      const fbUser = await prisma.flameborn_users.findUnique({ where: { userId_tenantId: { userId: user.id, tenantId } } });
      if (!fbUser || (fbUser.embers || 0n) < amount) return await replyV2(interaction, ContainerService.simple('❌ Insufficient balance in your personal wallet.'));

      await prisma.$transaction([
        prisma.flameborn_users.update({ where: { userId_tenantId: { userId: user.id, tenantId } }, data: { embers: { decrement: amount } } }),
        prisma.social_marriages.update({ where: { id: marriage.id }, data: { vaultBalance: { increment: amount } } })
      ]);

      return await replyV2(interaction, ContainerService.simple(`✅ Deposited **${Number(amount).toLocaleString()}** Embers into the joint vault.`));
    }

    if (sub === 'withdraw') {
      if (marriage.vaultBalance < amount) return await replyV2(interaction, ContainerService.simple('❌ Insufficient balance in the joint vault.'));

      await prisma.$transaction([
        prisma.social_marriages.update({ where: { id: marriage.id }, data: { vaultBalance: { decrement: amount } } }),
        prisma.flameborn_users.update({ where: { userId_tenantId: { userId: user.id, tenantId } }, data: { embers: { increment: amount } } })
      ]);

      return await replyV2(interaction, ContainerService.simple(`✅ Withdrew **${Number(amount).toLocaleString()}** Embers from the joint vault.`));
    }
  }
};
