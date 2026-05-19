import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-shop')
    .setDescription('🛠️ Administrative marketplace management.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
};
