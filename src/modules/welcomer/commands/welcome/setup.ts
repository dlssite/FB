import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { WelcomeRepository } from '../../database/WelcomeRepository';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('setup')
      .setDescription('Set the welcome channel and message')
      .addChannelOption(opt => opt.setName('channel').setDescription('The channel for welcome messages').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('The welcome message (use {user.mention}, {server.name})').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const channel = interaction.options.getChannel('channel', true);
    const message = interaction.options.getString('message', true);

    await WelcomeRepository.upsertSettings(tenantId, guildId, {
      welcomeInOn: true,
      welcomeInChannelId: channel.id,
      welcomeInEmbedText: message,
    });

    return await interaction.editReply({ content: `✅ Welcomer setup complete! Messages will be sent to ${channel}.` });
  },
};
