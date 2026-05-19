import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WelcomeRepository } from '../../database/WelcomeRepository';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('color')
      .setDescription('Set custom colors for the welcome card')
      .addStringOption(opt => opt.setName('text').setDescription('Hex color for the main text (e.g. #FFFFFF)'))
      .addStringOption(opt => opt.setName('border').setDescription('Hex color for the avatar border (e.g. #7367F0)'))
      .addStringOption(opt => opt.setName('embed').setDescription('Hex color for the embed sidebar')),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const text = interaction.options.getString('text');
    const border = interaction.options.getString('border');
    const embed = interaction.options.getString('embed');

    const updates: any = {};
    if (text) updates.welcomeInMainTextColor = text;
    if (border) updates.welcomeInAvatarBorderColor = border;
    if (embed) updates.welcomeInEmbedColor = embed;

    if (Object.keys(updates).length === 0) {
      return await interaction.editReply({ content: '❌ No colors provided.' });
    }

    await WelcomeRepository.upsertSettings(tenantId, guildId, updates);
    return await interaction.editReply({ content: '✅ Visual colors updated!' });
  },
};
