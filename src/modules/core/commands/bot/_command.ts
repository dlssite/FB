import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Technical metrics and core bot configuration'),
    
  async execute(interaction: ChatInputCommandInteraction) {
    // Subcommands are handled automatically by the loader
  },
};
