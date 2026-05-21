import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { GuildService } from '../../../../services/GuildService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('prefix')
      .setDescription('Change the bot prefix for this server')
      .addStringOption(option => 
        option.setName('new_prefix')
          .setDescription('The new prefix (max 5 characters)')
          .setRequired(true)),
          
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const newPrefix = interaction.options.getString('new_prefix', true);

    try {
      await GuildService.updatePrefix(tenantId, guildId, newPrefix);
      
      await interaction.editReply({
        content: `✅ Prefix updated to \`${newPrefix}\` for this server.`,
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Failed to update prefix: ${error.message}`,
      });
    }
  },
};
