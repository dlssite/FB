import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('👤 Universal profile hub for identity, customization, and aggregated statistics.'),
  
  async execute(interaction: any) {
    // Handled by command loader
  }
};
