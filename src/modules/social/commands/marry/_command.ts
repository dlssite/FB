import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('💍 Relationship and Marriage management module.'),
  
  // This is a master command, it will automatically load subcommands in its folder
  isMaster: true
};
