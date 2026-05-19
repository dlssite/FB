import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ProfileService } from '../../services/ProfileService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('unlock')
       .setDescription('🔓 Spend Embers to unlock premium profile customizations and privacy shield.')
       .addStringOption(opt => 
         opt.setName('feature')
            .setDescription('The premium feature to unlock')
            .setRequired(true)
            .addChoices(
              { name: '🎨 Custom Accent Color (5,000 💠)', value: 'customColor' },
              { name: '🖼️ Custom Banner Image (15,000 💠)', value: 'customBanner' },
              { name: '🔒 Premium Privacy Shield (25,000 💠)', value: 'privacyMode' }
            )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';
    const tenantId = context.tenantId;

    const feature = interaction.options.getString('feature', true) as 'customColor' | 'customBanner' | 'privacyMode';
    const price = flamebornConfig.profile.unlockPrices[feature];

    try {
      await ProfileService.unlockFeature(tenantId, interaction.user.id, feature);

      const featureName = Translator.t('profile', `unlock.features.${feature}`, lang);
      const response = ContainerService.create({
        title: Translator.t('profile', 'unlock.title_success', lang),
        description: Translator.t('profile', 'unlock.desc_success', lang, { feature: featureName, price: price.toLocaleString() }),
        color: '#FFD700',
        interaction
      });

      await replyV2(interaction, response);
    } catch (error: any) {
      let errKey = 'unlock.insufficient_funds';
      if (error.message === 'ALREADY_UNLOCKED') errKey = 'unlock.already_unlocked';

      const errResponse = ContainerService.create({
        title: '❌ Unlock Failed',
        description: Translator.t('profile', errKey, lang, { price: price.toLocaleString() }),
        color: '#D32F2F',
        interaction
      });

      await replyV2(interaction, errResponse);
    }
  }
};
