import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('meme')
       .setDescription('😂 Fetch a random meme from Reddit!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { title, url, postLink } = await FunService.getMeme();

    const linkBtn = new ButtonBuilder()
      .setLabel('View Post')
      .setStyle(ButtonStyle.Link)
      .setURL(postLink !== '#' ? postLink : 'https://reddit.com');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(linkBtn);

    const embed = ContainerService.create({
      title: title || '😂 Random Meme',
      image: url,
      color: '#ff4500', // Reddit orange
      components: [row],
      footer: true,
      interaction
    });

    await replyV2(interaction, embed);
  }
};
