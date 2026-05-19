import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('fact')
       .setDescription('🧠 Get a random, interesting fact!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';

    const fact = await FunService.getFact();

    const embed = ContainerService.create({
      title: Translator.t('fun', 'fact.title', lang) || '🧠 Random Fact',
      description: fact,
      color: '#00d2ff', // Light blue gradient color
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
