import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { LedgerService, TransactionType } from '../../services/LedgerService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('ledger')
       .setDescription('📜 View your recent economic transaction history.')
       .addUserOption(opt => opt.setName('target').setDescription('View another user\'s ledger (Staff only)')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const targetUser = interaction.options.getUser('target') || interaction.user;
    
    // Check permissions if targeting someone else
    if (targetUser.id !== interaction.user.id && !interaction.memberPermissions?.has('ManageGuild')) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'ledger.no_permission', lang)));
    }

    const transactions = await EconomyRepository.getTransactions(context.tenantId, targetUser.id, 10);

    if (transactions.length === 0) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'ledger.empty', lang)));
    }

    const ledgerEntries = transactions.map(tx => {
      const date = new Date(tx.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
      const amount = LedgerService.formatAmount(tx.amount, tx.type as TransactionType);
      const emoji = tx.type === 'INCOME' ? '🔼' : (tx.type === 'LOSS' ? '🔽' : (tx.type === 'TRANSFER' ? '🔁' : '⚙️'));
      const reason = tx.reason || Translator.t('economy', 'ledger.no_desc', lang);
      
      return `${emoji} **${tx.category}** - ${amount}\n└ *${reason}* \`(${date})\``;
    }).join('\n\n');

    const embed = ContainerService.create({
      title: Translator.t('economy', 'ledger.title', lang, { user: targetUser.username }),
      description: Translator.t('economy', 'ledger.desc_recent', lang, { entries: ledgerEntries }),
      image: flamebornConfig.economy.assets.bankBanner,
      color: '#7367F0',
      footer: true,
      interaction
    });

    return await replyV2(interaction, embed);
  }
};
