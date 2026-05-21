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
      console.log(`[PREFIX_UPDATE_DEBUG] Attempting to update - tenantId: ${tenantId}, guildId: ${guildId}, newPrefix: "${newPrefix}"`);
      await GuildService.updatePrefix(tenantId, guildId, newPrefix);
      console.log(`[PREFIX_UPDATE_DEBUG] Successfully updated!`);
      
      await interaction.editReply({
        content: `✅ Prefix updated to \`${newPrefix}\` for this server.`,
      });
    } catch (error: any) {
      console.log(`[PREFIX_UPDATE_DEBUG] Error: ${error.message}`);
      await interaction.editReply({
        content: `❌ Failed to update prefix: ${error.message}`,
      });
    }
  },
};
