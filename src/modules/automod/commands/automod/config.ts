import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { AutomodRepository } from '../../database/AutomodRepository';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('config')
      .setDescription('Configure logging and exemptions')
      .addChannelOption(opt => opt.setName('logs').setDescription('The channel for moderation logs'))
      .addRoleOption(opt => opt.setName('exempt_role').setDescription('A role to exempt from automod'))
      .addChannelOption(opt => opt.setName('exempt_channel').setDescription('A channel to exempt from automod')),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const logChannel = interaction.options.getChannel('logs');
    const exemptRole = interaction.options.getRole('exempt_role');
    const exemptChannel = interaction.options.getChannel('exempt_channel');

    const updates: any = {};
    if (logChannel) updates.logChannelId = logChannel.id;
    
    const settings = await AutomodRepository.getSettings(tenantId, guildId);
    
    if (exemptRole) {
      const roles = settings?.exemptRoles as string[] || [];
      if (!roles.includes(exemptRole.id)) roles.push(exemptRole.id);
      updates.exemptRoles = roles;
    }

    if (exemptChannel) {
      const channels = settings?.exemptChannels as string[] || [];
      if (!channels.includes(exemptChannel.id)) channels.push(exemptChannel.id);
      updates.exemptChannels = channels;
    }

    await AutomodRepository.upsertSettings(tenantId, guildId, updates);
    return await interaction.editReply({ content: '✅ Automod configuration updated!' });
  },
};
