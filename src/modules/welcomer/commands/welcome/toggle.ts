import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WelcomeRepository } from '../../database/WelcomeRepository';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('toggle')
      .setDescription('Enable or disable the welcome system')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Whether to enable the welcomer').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const enabled = interaction.options.getBoolean('enabled', true);
    
    await WelcomeRepository.upsertSettings(tenantId, guildId, { welcomeInOn: enabled });
    return await interaction.editReply({ content: `✅ Welcomer has been **${enabled ? 'enabled' : 'disabled'}**.` });
  },
};
