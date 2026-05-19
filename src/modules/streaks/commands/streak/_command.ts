import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription('🔥 Manage your daily streaks and rewards.')
    .setNSFW(false)
    .addSubcommand(subcmd => 
      subcmd
        .setName('claim')
        .setDescription('Claim your daily streak for XP and Embers')
    )
    .addSubcommand(subcmd => 
      subcmd
        .setName('info')
        .setDescription('View your current streak status and available freezes')
    )
    .addSubcommand(subcmd => 
      subcmd
        .setName('leaderboard')
        .setDescription('View the server\'s top streakers')
    )
    .addSubcommand(subcmd => 
      subcmd
        .setName('manage')
        .setDescription('Admin: Manage server streak settings')
        .addRoleOption(option => 
          option
            .setName('top_role')
            .setDescription('The role to automatically assign to the top streaker')
            .setRequired(false)
        )
        .addBooleanOption(option => 
          option
            .setName('enabled')
            .setDescription('Enable or disable the streak module')
            .setRequired(false)
        )
    ),

  async execute() {
    // Routed by commandLoader
  }
};
