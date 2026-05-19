import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('🛡️ Smart Verification & Onboarding')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
};
