import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('math')
       .setDescription('🧮 Solve a math expression!')
       .addStringOption(opt => 
         opt.setName('expression')
            .setDescription('The mathematical expression to evaluate (e.g., 2 + 2, sqrt(16))')
            .setRequired(true)
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';
    const expression = interaction.options.getString('expression', true);

    const result = FunService.evaluateMath(expression);

    const isError = result.includes('Error') || result.includes('Invalid');

    const embed = ContainerService.create({
      title: Translator.t('fun', isError ? 'math.error_title' : 'math.title', lang) || (isError ? '❌ Math Error' : '🧮 Math Solver'),
      description: `**${Translator.t('fun', 'math.expression', lang) || 'Expression'}:**\n\`\`\`\n${expression}\n\`\`\`\n**${Translator.t('fun', 'math.result', lang) || 'Result'}:**\n\`\`\`\n${result}\n\`\`\``,
      color: isError ? '#EA5455' : '#28C76F', // Red for error, green for success
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
