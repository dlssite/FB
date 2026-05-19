import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('faction')
    .setDescription('🛡️ Faction & Syndicate System')
    .setDMPermission(false),
    
  async execute() {
    // Execution is automatically handled by the commandLoader which will route to subcommands
  }
};
