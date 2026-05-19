import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('daily')
       .setDescription('🎁 Claim your daily Ember stipend.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    if (!interaction.guild) return;

    const result = await EconomyService.claimDaily(context.tenantId, interaction.guild.id, interaction.user.id, interaction.member);

    if (!result.success) {
      const cooldownEmbed = ContainerService.create({
        title: '⌛ Reward Cooldown',
        description: Translator.t('economy', 'daily.cooldown', lang, { time: result.message }),
        image: flamebornConfig.economy.assets.cooldownBanner,
        color: '#F9AC19',
        interaction
      });
      return await replyV2(interaction, cooldownEmbed);
    }

    const response = ContainerService.create({
      title: Translator.t('economy', 'daily.title', lang),
      description: Translator.t('economy', 'daily.desc', lang, { amount: result.amount?.toLocaleString() }),
      image: flamebornConfig.economy.assets.dailyBanner,
      color: '#28C76F',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
