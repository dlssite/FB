import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ProfileService } from '../../services/ProfileService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('customize')
       .setDescription('🎨 Apply unlocked customizations or toggle privacy mode.')
       .addStringOption(opt => opt.setName('color').setDescription('Custom hex color (e.g. #FF5722)').setRequired(false))
       .addStringOption(opt => opt.setName('banner').setDescription('Custom banner image URL').setRequired(false))
       .addBooleanOption(opt => opt.setName('privacy').setDescription('Toggle Premium Privacy Mode').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';
    const tenantId = context.tenantId;

    const color = interaction.options.getString('color');
    const banner = interaction.options.getString('banner');
    const privacyOpt = interaction.options.getBoolean('privacy');

    try {
      const msgs: string[] = [];

      if (color !== null) {
        await ProfileService.setCustomColor(tenantId, interaction.user.id, color);
        msgs.push(Translator.t('profile', 'customize.color_success', lang, { color }));
      }

      if (banner !== null) {
        await ProfileService.setCustomBanner(tenantId, interaction.user.id, banner);
        msgs.push(Translator.t('profile', 'customize.banner_success', lang));
      }

      if (privacyOpt !== null) {
        const newMode = await ProfileService.togglePrivacyMode(tenantId, interaction.user.id);
        msgs.push(Translator.t('profile', 'customize.privacy_success', lang, { status: newMode ? 'ACTIVE 🔒' : 'DISABLED 🔓' }));
      }

      if (msgs.length === 0) {
        msgs.push('*No customization options were provided. Use `/profile customize` with options!*');
      }

      const response = ContainerService.create({
        title: Translator.t('profile', 'customize.title', lang),
        description: msgs.join('\n\n'),
        color: '#AB47BC',
        interaction
      });

      await replyV2(interaction, response);
    } catch (error: any) {
      const errResponse = ContainerService.create({
        title: '❌ Customization Failed',
        description: Translator.t('profile', 'customize.not_unlocked', lang),
        color: '#D32F2F',
        interaction
      });

      await replyV2(interaction, errResponse);
    }
  }
};
