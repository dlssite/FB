import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  ephemeral: true,
  data: new SlashCommandBuilder()
    .setName('modmail')
    .setDescription('📩 Smart Modmail system')
    // No default member permissions because `contact` is public.
    // We will handle permissions in subcommands or rely on Discord's native subcommand permissions if we upgrade.
};
