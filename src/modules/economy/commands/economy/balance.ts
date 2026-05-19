import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { VaultService } from '../../services/VaultService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('balance')
       .setDescription('💰 View current balances.')
       .addUserOption(opt => opt.setName('target').setDescription('The user whose balance you want to check').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const targetUser = interaction.options.getUser('target') || interaction.user;
    const user = await EconomyRepository.getUser(context.tenantId, targetUser.id);
    const vault = VaultService.getVault(user?.bankType || 'prism_ledger');
    
    const embers = user?.embers?.toString() || '0';
    const rubies = user?.flamebornRuby?.toString() || '0';
    const vaultBal = (vault.hidden && targetUser.id !== interaction.user.id) 
      ? Translator.t('economy', 'balance.secured', lang) 
      : Number(user?.emberVault || 0).toLocaleString();

    const response = ContainerService.create({
      title: Translator.t('economy', 'balance.title', lang),
      description: Translator.t('economy', 'balance.desc', lang, { user: `<@${targetUser.id}>` }),
      image: flamebornConfig.economy.assets.bankBanner,
      fields: [
        { name: Translator.t('economy', 'balance.embers', lang), value: `\`${Number(embers).toLocaleString()}\``, inline: true },
        { name: Translator.t('economy', 'balance.rubies', lang), value: `\`${Number(rubies).toLocaleString()}\``, inline: true },
        { name: Translator.t('economy', 'balance.vault', lang), value: `\`${vaultBal}\``, inline: true }
      ],
      thumbnail: targetUser.displayAvatarURL(),
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
