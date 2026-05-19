import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('friend')
    .setDescription('🤝 Build and manage your social network.'),
  
  isMaster: true
};
