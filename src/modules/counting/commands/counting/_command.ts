import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('counting')
    .setDescription('🔢 Manage and view statistics for the counting game.')
    .setNSFW(false),

  async execute() {
    // Routed by CommandLoader
  }
};
