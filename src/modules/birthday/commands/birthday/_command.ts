import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('🎂 Advanced, immersive birthday celebrations and wish walls.'),
  
  async execute() {
    // Dynamic command loader handles subcommand execution
  }
};
