import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('transport')
    .setDescription('⚙️ Manage spatial rifts and teleportation.'),
  
  async execute(interaction: any) {
    // Handled by subcommand router in commandLoader
  }
};
