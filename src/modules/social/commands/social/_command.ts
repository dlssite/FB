import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('🫂 Manage your social life and relationships.'),
  execute: async (interaction: any) => {
    // This will be handled by the command loader's subcommand routing
  }
};
