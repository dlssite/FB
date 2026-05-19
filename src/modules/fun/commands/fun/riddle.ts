import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';
import { Translator } from '../../../../core/Translator';
import { RedisService } from '../../../../services/RedisService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('riddle')
       .setDescription('🤔 Get a random riddle to solve!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';

    const { question, answer } = await FunService.getRiddle();

    // Cache the answer in Redis for 10 minutes (600 seconds)
    const uuid = Math.random().toString(36).substring(2, 10);
    await RedisService.set(`fun:riddle:${uuid}`, answer, 600);

    const revealBtn = new ButtonBuilder()
      .setCustomId(`fun_riddle_${uuid}`)
      .setLabel(Translator.t('fun', 'riddle.reveal_btn', lang) || 'Reveal Answer')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💡');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(revealBtn);

    const embed = ContainerService.create({
      title: Translator.t('fun', 'riddle.title', lang) || '🤔 Riddle Me This',
      description: `**${question}**\n\n*Click the button below when you give up!*`,
      color: '#9b59b6', // Purple
      components: [row],
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
