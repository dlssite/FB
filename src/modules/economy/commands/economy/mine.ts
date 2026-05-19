import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('mine')
       .setDescription('⛏️ Start a geographic mining operation.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const { tenantId, guildId } = context;
    const result = await EconomyService.mine(
      tenantId, 
      guildId, 
      interaction.user.id, 
      interaction.channel, 
      interaction.member as GuildMember
    );

    if (!result.success) {
      if (result.reason === 'COOLDOWN') {
        const cooldownEmbed = ContainerService.create({
          title: Translator.t('economy', 'mine.cooldown_title', lang),
          description: result.message,
          image: flamebornConfig.economy.assets.cooldownBanner,
          color: '#F9AC19',
          interaction
        });
        return await replyV2(interaction, cooldownEmbed);
      }
      return await replyV2(interaction, ContainerService.simple(`❌ ${result.message}`));
    }

    const response = ContainerService.create({
      title: Translator.t('economy', 'mine.title', lang),
      description: Translator.t('economy', 'mine.desc', lang, { territory: result.territory }),
      image: flamebornConfig.economy.assets.mineBanner,
      fields: [
        { name: Translator.t('economy', 'mine.target', lang), value: `\`${result.resource?.toUpperCase()}\``, inline: true },
        { name: Translator.t('economy', 'mine.duration', lang), value: Translator.t('economy', 'mine.hours', lang, { hours: result.hours }), inline: true },
        { name: Translator.t('economy', 'mine.completion', lang), value: `<t:${Math.floor(result.endTime!.getTime() / 1000)}:R>`, inline: true }
      ],
      color: '#F9AC19',
      footer: Translator.t('economy', 'mine.footer', lang),
      interaction
    });

    await replyV2(interaction, response);
  }
};
