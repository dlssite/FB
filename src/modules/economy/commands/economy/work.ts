import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('work')
       .setDescription('💼 Perform a shift in the industrial sector to earn Embers.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const result = await EconomyService.processWork(context.tenantId, interaction.user.id, interaction.channel);

    if (!result.success) {
      const cooldownEmbed = ContainerService.create({
        title: '⌛ Shift Cooldown',
        description: Translator.t('economy', 'work.cooldown', lang, { time: result.message }),
        image: flamebornConfig.economy.assets.cooldownBanner,
        color: '#F9AC19',
        interaction
      });
      return await replyV2(interaction, cooldownEmbed);
    }

    let description = Translator.t('economy', 'work.desc', lang, { job: result.job, amount: result.amount?.toLocaleString() });
    if (result.taxAmount && result.taxAmount > 0) {
        description += `\n\n⚠️ **Sovereign Tax:** 💎 ${result.taxAmount.toLocaleString()} Embers were collected by the Syndicate **${result.sovereignName}** as a territory tribute.`;
    }

    const response = ContainerService.create({
      title: Translator.t('economy', 'work.title', lang),
      description,
      image: flamebornConfig.economy.assets.workBanner,
      color: '#28C76F',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
