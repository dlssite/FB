import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WelcomeRepository } from '../../database/WelcomeRepository';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('image')
      .setDescription('Set a custom background image for the welcome card')
      .addStringOption(opt => opt.setName('url').setDescription('The direct URL to a background image (800x400 recommended)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const url = interaction.options.getString('url', true);
    
    if (!url.startsWith('http')) {
      return await interaction.editReply({ content: '❌ Please provide a valid HTTP/HTTPS URL.' });
    }

    await WelcomeRepository.upsertSettings(tenantId, guildId, { welcomeInBackgroundUrl: url });
    return await interaction.editReply({ content: `✅ Background image updated! Try \`/welcome test\` to see it.` });
  },
};
