import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { CareerPath } from '../../services/CareerService';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('career')
       .setDescription('🎓 Choose your career path and view progression.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const user = await EconomyRepository.getUser(context.tenantId, interaction.user.id);
    const currentCareerId = user?.careerMastered || 0;

    const careers = [
      { id: 1, key: 'industrialist', emoji: '🏭', path: CareerPath.INDUSTRIALIST },
      { id: 2, key: 'merchant', emoji: '⚖️', path: CareerPath.MERCHANT },
      { id: 3, key: 'shadow', emoji: '👤', path: CareerPath.SHADOW },
      { id: 4, key: 'scholar', emoji: '📜', path: CareerPath.SCHOLAR },
    ];

    const currentCareerName = currentCareerId === 0 
      ? Translator.t('economy', 'career.none', lang)
      : Translator.t('economy', `career.paths.${careers.find(c => c.id === currentCareerId)?.key}.name`, lang);

    const select = new StringSelectMenuBuilder()
      .setCustomId('career_select')
      .setPlaceholder(Translator.t('economy', 'career.placeholder', lang))
      .addOptions(
        careers.map(c => 
          new StringSelectMenuOptionBuilder()
            .setLabel(Translator.t('economy', `career.paths.${c.key}.name`, lang))
            .setDescription(Translator.t('economy', `career.paths.${c.key}.desc`, lang))
            .setValue(c.id.toString())
            .setEmoji(c.emoji)
            .setDefault(c.id === currentCareerId)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const container = ContainerService.create({
      title: Translator.t('economy', 'career.title', lang),
      description: Translator.t('economy', 'career.desc_manage', lang, { career: currentCareerName }),
      image: flamebornConfig.economy.assets.careerBanner,
      color: '#7367F0',
      interaction,
      components: [row],
      footer: true
    });

    await replyV2(interaction, container);
    const response = await interaction.fetchReply();

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return;
      await i.deferUpdate().catch(() => {});

      const selectedId = parseInt(i.values[0]);
      const careerData = careers.find(c => c.id === selectedId);
      
      const careerName = Translator.t('economy', `career.paths.${careerData?.key}.name`, lang);
      const careerDesc = Translator.t('economy', `career.paths.${careerData?.key}.desc`, lang);

      await EconomyRepository.updateCareer(context.tenantId, interaction.user.id, selectedId);

      const success = ContainerService.create({
        title: Translator.t('economy', 'career.title_updated', lang),
        description: Translator.t('economy', 'career.desc_updated', lang, { career: careerName, emoji: careerData?.emoji, desc: careerDesc }),
        color: '#28C76F',
        interaction,
        footer: true
      });

      await replyV2(interaction, success);
    });
  }
};
