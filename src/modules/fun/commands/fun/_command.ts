import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('🎉 Creative entertainment, games, and jokes.'),
  
  async execute() {
    // The commandLoader will automatically route subcommands to their respective files.
  }
};
