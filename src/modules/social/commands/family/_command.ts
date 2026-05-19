import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('family')
    .setDescription('👨‍👩‍👧‍👦 Founding and managing family dynasties.'),
  
  isMaster: true
};
