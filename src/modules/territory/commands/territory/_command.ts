import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('territory')
    .setDescription('⚙️ Manage and view server nations.'),
  
  async execute(interaction: any) {
    // This will be handled by the command loader to route to subcommands
  }
};
