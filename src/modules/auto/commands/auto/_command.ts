import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('auto')
    .setDescription('🤖 Manage unified automated responses and reactions.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute() {
    // Execution logic is handled by subcommands
  }
};
