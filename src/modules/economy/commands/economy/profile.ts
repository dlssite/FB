import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { MarketEngine } from '../../services/MarketEngine';
import { VaultService } from '../../services/VaultService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('profile')
       .setDescription('👤 View an advanced economy profile and net worth.')
       .addUserOption(opt => opt.setName('target').setDescription('The user whose profile you want to check').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const targetUser = interaction.options.getUser('target') || interaction.user;

    const [user, inventory] = await Promise.all([
      EconomyRepository.getUser(context.tenantId, targetUser.id),
      EconomyRepository.getInventory(context.tenantId, targetUser.id)
    ]);

    // Calculate Portfolio Value
    let portfolioValue = 0;
    const resourceStrings: string[] = [];
    
    for (const item of inventory) {
      const marketRes = await MarketEngine.getResource(item.itemName, 100);
      const totalVal = item.quantity * marketRes.currentPrice;
      portfolioValue += totalVal;
      resourceStrings.push(`${marketRes.name}: \`${item.quantity}\` (≈${totalVal.toLocaleString()} 💠)`);
    }
    const resources = resourceStrings.join('\n');

    const totalNetWorth = Number(user?.embers || 0) + Number(user?.emberVault || 0) + portfolioValue;
    const vault = VaultService.getVault(user?.bankType || 'prism_ledger');

    const vaultBal = (vault.hidden && targetUser.id !== interaction.user.id) 
      ? Translator.t('economy', 'balance.secured', lang) 
      : Number(user?.emberVault || 0).toLocaleString();

    const response = ContainerService.create({
      title: Translator.t('economy', 'profile.title', lang, { user: targetUser.username }),
      description: Translator.t('economy', 'profile.desc', lang, { tag: targetUser.tag }),
      image: flamebornConfig.economy.assets.profileBanner,
      fields: [
        { 
          name: Translator.t('economy', 'profile.liquid_savings', lang), 
          value: `${Translator.t('economy', 'profile.embers', lang)}: \`${Number(user?.embers || 0).toLocaleString()}\`\n${Translator.t('economy', 'profile.vault', lang)}: \`${vaultBal}\``, 
          inline: true 
        },
        { 
          name: Translator.t('economy', 'profile.account_type', lang), 
          value: `**${Translator.t('economy', `vault.types.${vault.id}.name`, lang)}**\n${Translator.t('economy', 'profile.interest_label', lang)}: \`${(vault.interestRate * 100).toFixed(1)}%/day\``, 
          inline: true 
        },
        { 
          name: Translator.t('economy', 'profile.portfolio', lang), 
          value: resources || Translator.t('economy', 'profile.no_resources', lang), 
          inline: false 
        }
      ],
      thumbnail: targetUser.displayAvatarURL(),
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
