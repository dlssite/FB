import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MarketEngine } from '../../services/MarketEngine';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('prices')
       .setDescription('📊 View current live resource prices.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const prices = await MarketEngine.getPrices();

    if (prices.length === 0) {
      return await replyV2(
        interaction,
        ContainerService.simple(Translator.t('economy', 'market.dashboard_empty', lang))
      );
    }

    const priceList = prices.map(p => {
      const trend = p.currentPrice > p.lastPrice ? '📈' : (p.currentPrice < p.lastPrice ? '📉' : '➖');
      return `• **${p.name}**: \`${p.currentPrice.toFixed(2)} 💠\` ${trend}`;
    }).join('\n');

    const response = ContainerService.create({
      title: Translator.t('economy', 'market.dashboard_title', lang),
      description: Translator.t('economy', 'market.dashboard_desc', lang, { prices: priceList }),
      image: flamebornConfig.economy.assets.marketBanner,
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
