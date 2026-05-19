import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('sell')
       .setDescription('💰 Sell resources to the market.')
       .addStringOption(opt => opt.setName('resource').setDescription('The resource ID to sell').setRequired(true))
       .addIntegerOption(opt => opt.setName('quantity').setDescription('Amount to sell').setRequired(true).setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const resourceId = interaction.options.getString('resource', true).toLowerCase();
    const quantity = interaction.options.getInteger('quantity', true);

    const result = await EconomyService.sellResource(context.tenantId, interaction.user.id, resourceId, quantity);

    if (!result.success) {
      return await replyV2(
        interaction,
        ContainerService.simple(`❌ ${result.message}`)
      );
    }

    const response = ContainerService.create({
      title: Translator.t('economy', 'market.title_sell', lang),
      description: Translator.t('economy', 'market.desc_sell', lang, { quantity, resource: result.resourceName }),
      image: flamebornConfig.economy.assets.marketBanner,
      fields: [
        { name: Translator.t('economy', 'market.total_gain', lang), value: `\`${result.payout?.toLocaleString()} 💠\``, inline: true },
        { name: (lang === 'fr' ? '🏛️ Taxe de Marché' : '🏛️ Market Tax'), value: `\`10%\``, inline: true }
      ],
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
