import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('trivia')
       .setDescription('🎮 Start a quick music trivia based on the current song.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const container = ContainerService.create({
      title: '🎮 Symphony | Music Trivia',
      description: 'Who is the original artist of the song currently playing?',
      color: '#E67E22',
      footer: true,
      interaction
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId('trivia_correct').setLabel('Correct Artist').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trivia_wrong_1').setLabel('Wrong Artist A').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trivia_wrong_2').setLabel('Wrong Artist B').setStyle(ButtonStyle.Secondary)
      );

    // Merge components into container response
    const payload = { ...container, components: [row] };

    await replyV2(interaction, payload);
  }
};
