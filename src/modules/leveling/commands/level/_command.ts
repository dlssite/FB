import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('🧬 Neural Progression System'),
  
  // The commandLoader will automatically populate subcommands from this directory
  execute: async () => {} 
};
