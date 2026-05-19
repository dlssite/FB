import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('coinflip')
       .setDescription('🪙 Flip a coin to test your luck!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const localizedResult = Translator.t('fun', `coinflip.${result}`, lang) || (result === 'heads' ? 'Heads' : 'Tails');

    const resultMsg = Translator.t('fun', 'coinflip.result', lang, { result: localizedResult }) || `The coin landed on **${localizedResult}**!`;

    const embed = ContainerService.create({
      title: Translator.t('fun', 'coinflip.title', lang) || '🪙 Coin Flip',
      description: resultMsg,
      color: '#ffd700', // Gold
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
