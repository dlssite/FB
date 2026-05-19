import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('8ball')
       .setDescription('🎱 Ask the Magic 8-Ball a question!')
       .addStringOption(opt => 
         opt.setName('question')
            .setDescription('What do you want to ask?')
            .setRequired(true)
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';
    const question = interaction.options.getString('question', true);

    const answers = [
      // Positive
      'It is certain.',
      'It is decidedly so.',
      'Without a doubt.',
      'Yes, definitely.',
      'You may rely on it.',
      'As I see it, yes.',
      'Most likely.',
      'Outlook good.',
      'Yes.',
      'Signs point to yes.',
      // Neutral
      'Reply hazy, try again.',
      'Ask again later.',
      'Better not tell you now.',
      'Cannot predict now.',
      'Concentrate and ask again.',
      // Negative
      "Don't count on it.",
      'My reply is no.',
      'My sources say no.',
      'Outlook not so good.',
      'Very doubtful.'
    ];

    const answer = answers[Math.floor(Math.random() * answers.length)];

    const embed = ContainerService.create({
      title: Translator.t('fun', '8ball.title', lang) || '🎱 Magic 8-Ball',
      description: `**${Translator.t('fun', '8ball.question', lang) || 'Question'}:**\n*${question}*\n\n**${Translator.t('fun', '8ball.answer', lang) || 'Answer'}:**\n🎱 **${answer}**`,
      color: '#34495e', // Dark navy
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
