import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('vehicle')
    .setDescription('🚲 Manage your personal transportation fleet.'),
  
  async execute(interaction: any) {
    // Handled by subcommand router in commandLoader
  }
};
