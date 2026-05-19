import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('📈 Advanced Invite Tracking system.'),
  
  async execute() {
    // Handled by commandLoader
  }
};
