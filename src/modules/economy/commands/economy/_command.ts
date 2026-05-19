import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('💠 Master command for balance, mining, market, and progression.'),
  
  async execute(interaction: any) {
    // Handled by command loader
  }
};
