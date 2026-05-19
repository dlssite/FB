import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { VaultService } from '../../services/VaultService';
import { LedgerService } from '../../services/LedgerService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('transfer')
       .setDescription('💸 Wire embers to another user.')
       .addUserOption(opt => opt.setName('target').setDescription('The recipient').setRequired(true))
       .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const targetUser = interaction.options.getUser('target', true);
    const amount = interaction.options.getInteger('amount', true);

    if (targetUser.id === interaction.user.id) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'transfer.no_self', lang)));
    }

    if (targetUser.bot) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'transfer.no_bot', lang)));
    }

    const sender = await EconomyRepository.getUser(context.tenantId, interaction.user.id);
    if (!sender || Number(sender.embers || 0) < amount) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'transfer.not_enough', lang)));
    }

    const vault = VaultService.getVault(sender.bankType || 'prism_ledger');
    const fee = Math.floor(amount * vault.transferFee);
    const netAmount = amount - fee;

    // Process Transaction
    await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: -amount });
    await EconomyRepository.updateBalance(context.tenantId, targetUser.id, { embers: netAmount });

    // Log for Sender
    await LedgerService.log({
      tenantId: context.tenantId,
      userId: interaction.user.id,
      type: 'TRANSFER',
      category: 'SENT',
      amount: -amount,
      reason: `Wired to <@${targetUser.id}>`,
      metadata: { targetId: targetUser.id, fee }
    });

    // Log for Receiver
    await LedgerService.log({
      tenantId: context.tenantId,
      userId: targetUser.id,
      type: 'TRANSFER',
      category: 'RECEIVED',
      amount: netAmount,
      reason: `Wired from <@${interaction.user.id}>`,
      metadata: { senderId: interaction.user.id, netAmount }
    });

    const vaultName = Translator.t('economy', `vault.types.${vault.id}.name`, lang);

    const embed = ContainerService.create({
      title: Translator.t('economy', 'transfer.title', lang),
      description: Translator.t('economy', 'transfer.desc', lang, { 
        amount: netAmount.toLocaleString(), 
        user: targetUser.id,
        fee_label: Translator.t('economy', 'transfer.fee_label', lang),
        fee: fee.toLocaleString(),
        percent: (vault.transferFee * 100).toFixed(0),
        network_label: Translator.t('economy', 'transfer.network_label', lang),
        network: vaultName
      }),
      image: vault.banner,
      color: '#28C76F',
      footer: true,
      interaction
    });

    return await replyV2(interaction, embed);
  }
};
