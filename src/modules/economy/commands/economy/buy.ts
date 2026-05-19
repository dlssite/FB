import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('buy')
       .setDescription('💸 Buy resources from the market.')
       .addStringOption(opt => opt.setName('resource').setDescription('The resource ID to buy').setRequired(true))
       .addIntegerOption(opt => opt.setName('quantity').setDescription('Amount to buy').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const resourceId = interaction.options.getString('resource', true).toLowerCase();
    const quantity = interaction.options.getInteger('quantity', true);

    const result = await EconomyService.buyResource(context.tenantId, interaction.user.id, resourceId, quantity);

    if (!result.success) {
      return await replyV2(interaction, ContainerService.simple(`❌ ${result.message}`));
    }

    const response = ContainerService.create({
      title: Translator.t('economy', 'market.title_buy', lang),
      description: Translator.t('economy', 'market.desc_buy', lang, { quantity, resource: result.resourceName }),
      image: flamebornConfig.economy.assets.marketBanner,
      fields: [
        { name: Translator.t('economy', 'market.total_cost', lang), value: `\`${result.cost?.toLocaleString()} 💠\``, inline: true },
        { name: '📦 ' + (lang === 'fr' ? 'Stock' : 'New Balance'), value: Translator.t('economy', 'market.stockpile', lang), inline: true }
      ],
      color: '#28C76F',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
