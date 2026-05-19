import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ProfileService } from '../../services/ProfileService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('bio')
       .setDescription('📝 Update your personal profile bio.')
       .addStringOption(opt => opt.setName('text').setDescription('Your new bio text (max 200 chars)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';
    const tenantId = context.tenantId;

    const text = interaction.options.getString('text', true);
    const updated = await ProfileService.updateBio(tenantId, interaction.user.id, text);

    const response = ContainerService.create({
      title: Translator.t('profile', 'bio.title', lang),
      description: Translator.t('profile', 'bio.desc', lang, { bio: updated.bio }),
      color: '#00E676',
      interaction
    });

    await replyV2(interaction, response);
  }
};
