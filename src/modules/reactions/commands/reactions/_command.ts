import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('reactions')
    .setDescription('Self-reaction role management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  
  async execute(interaction: any) {
    // This will be replaced by command loader's subcommand routing
    // Subcommands: panel (create, list, delete), item (add, remove), emoji (link, unlink, list), stats
  }
};
