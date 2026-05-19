import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tod')
    .setDescription('🎭 Truth or Dare Master System')
    .setNSFW(false), // Spicy tier handled via internal checks

  async execute() {
    // Routed by commandLoader
  }
};
