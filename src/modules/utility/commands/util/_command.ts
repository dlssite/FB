import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('util')
    .setDescription('General purpose utility and information tools'),
    
  async execute(interaction: ChatInputCommandInteraction) {
    // Subcommands are handled automatically by the loader
  },
};
