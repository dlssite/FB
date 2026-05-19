import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';
import { Translator } from '../../../../core/Translator';
import { RedisService } from '../../../../services/RedisService';

function decode(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&deg;/g, '°');
}

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('trivia')
       .setDescription('❓ Play a game of trivia!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';

    const rawTrivia = await FunService.getTrivia();

    // Decode HTML entities (e.g. &quot; to ") because OpenTDB returns encoded strings
    const question = decode(rawTrivia.question);
    const correctAnswer = decode(rawTrivia.correctAnswer);
    const options = rawTrivia.options.map(opt => decode(opt));
    const category = decode(rawTrivia.category);
    const difficulty = rawTrivia.difficulty.toUpperCase();

    const uuid = Math.random().toString(36).substring(2, 10);
    
    // Save answer and metadata to Redis for 60 seconds (game duration)
    await RedisService.set(`fun:trivia:${uuid}`, JSON.stringify({
      correctAnswer,
      question,
      options,
      userId: interaction.user.id
    }), 60);

    // Build choice buttons
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    options.forEach((opt, index) => {
      // Button customId must be within 100 chars
      // Structure: fun_trivia_{uuid}_{index}
      const btn = new ButtonBuilder()
        .setCustomId(`fun_trivia_${uuid}_${index}`)
        .setLabel(opt.substring(0, 80)) // Limit label size to prevent Discord errors
        .setStyle(ButtonStyle.Secondary);
      
      row.addComponents(btn);
    });

    const embed = ContainerService.create({
      title: Translator.t('fun', 'trivia.title', lang) || '❓ Trivia Time!',
      description: `**Category:** ${category} | **Difficulty:** ${difficulty}\n\n**${question}**\n\n*Choose the correct answer below within 60 seconds!*`,
      color: '#3498db', // Blue
      components: [row],
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
