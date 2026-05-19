import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎶 Symphony Music Engine - Control the server vibes.')
    .setNSFW(false),

  async execute() {
    // Routed by CommandLoader
  }
};
