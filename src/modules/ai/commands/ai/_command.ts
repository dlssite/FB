import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('🧠 Master command for the Cognitive Engine module.'),
  
  async execute() {
    // Execution is automatically handled and routed by the commandLoader
  }
};
