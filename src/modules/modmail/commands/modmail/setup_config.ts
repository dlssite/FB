import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ModmailRepository } from '../../database/ModmailRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('setup_config')
       .setDescription('Configure base Modmail settings')
       .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel for modmail threads').setRequired(false))
       .addRoleOption(opt => opt.setName('default_ping').setDescription('Fallback role to ping').setRequired(false))
       .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable Modmail').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
       const container = ContainerService.simple('❌ You do not have permission to configure Modmail.', { color: '#E74C3C' });
       return await replyV2(interaction, container);
    }

    const channel = interaction.options.getChannel('log_channel');
    const ping = interaction.options.getRole('default_ping');
    const enabled = interaction.options.getBoolean('enabled');

    const updateData: any = {};
    if (channel) updateData.logChannelId = channel.id;
    if (ping) updateData.defaultPingRoleId = ping.id;
    if (enabled !== null) updateData.enabled = enabled;

    await ModmailRepository.updateSettings(context.tenantId, context.guildId, updateData);
    const container = ContainerService.simple(`✅ Modmail config updated.`, { color: '#2ECC71' });
    await replyV2(interaction, container);
  }
};
