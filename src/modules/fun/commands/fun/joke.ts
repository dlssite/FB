import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('joke')
       .setDescription('🎭 Tell me a random joke!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';

    const joke = await FunService.getJoke();

    const embed = ContainerService.create({
      title: Translator.t('fun', 'joke.title', lang) || '🎭 Random Joke',
      description: joke,
      color: '#ffcc00', // Yellow
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
