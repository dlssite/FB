import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UtilityRepository } from '../../database/UtilityRepository';
import { AutomodRepository } from '../../../automod/database/AutomodRepository';
import { TenantRepository } from '../../../../repositories/TenantRepository';
import { ContainerService } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('report')
      .setDescription('Reports a user to the server staff')
      .addUserOption(opt => opt.setName('target').setDescription('The user you are reporting').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('The reason for the report').setRequired(true)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason', true);
    const guildId = interaction.guildId!;
    const tenantId = await TenantRepository.getTenantForGuild(guildId) || process.env.TENANT_ID || 'tenant_alpha_01';

    if (target.id === interaction.user.id) {
      return await interaction.editReply(ContainerService.simple('❌ You cannot report yourself.', { color: '#EA5455' }));
    }

    if (target.bot) {
      return await interaction.editReply(ContainerService.simple('❌ You cannot report bots.', { color: '#EA5455' }));
    }

    // 1. Save to Database via Repository
    const report = await UtilityRepository.createReport({
      guildId,
      tenantId,
      reporterId: interaction.user.id,
      targetId: target.id,
      reason: reason
    });

    // 2. Notify Staff (If a log channel is configured)
    const automodSettings = await AutomodRepository.getSettings(tenantId, guildId);

    const reportContainer = ContainerService.create({
      title: `🚩 New Report [ID: #${report.id}]`,
      color: '#FF4C4C',
      fields: [
        { name: '👤 Target', value: `${target.tag} (\`${target.id}\`)` },
        { name: '🛡️ Reporter', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: '📝 Reason', value: reason }
      ],
      footer: true,
      interaction
    });

    if (automodSettings?.logChannelId) {
      const logChannel = await interaction.guild?.channels.fetch(automodSettings.logChannelId).catch(() => null);
      if (logChannel?.isTextBased()) {
        await logChannel.send(reportContainer);
      }
    }

    await interaction.editReply(ContainerService.simple('✅ Your report has been submitted to the server staff. Thank you for helping keep the community safe!', { color: '#28C76F' }));
  },
};
