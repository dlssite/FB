import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('avatar')
      .setDescription('Shows the avatar of a user')
      .addUserOption(opt => opt.setName('target').setDescription('The user to view the avatar of')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('target') || interaction.user;
    
    await interaction.editReply(ContainerService.create({
      title: `Avatar for ${user.tag}`,
      media: [user.displayAvatarURL({ size: 1024 })],
      color: '#7367F0',
      interaction
    }));
  },
};
