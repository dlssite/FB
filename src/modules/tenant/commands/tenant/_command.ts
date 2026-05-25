import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tenant')
    .setDescription('Manage and view tenant information and module configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  
  async execute(interaction: any) {
    // This will be replaced by command loader's subcommand routing
    // Subcommands: status, modules, list, info, admin (group)
  }
};
