import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TenantService } from '../../../services/TenantService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('info')
      .setDescription('Get detailed information about a specific tenant')
      .addStringOption(opt =>
        opt
          .setName('tenant')
          .setDescription('Tenant ID (default: current tenant)')
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const tenantId = interaction.options.getString('tenant') || flamebornConfig.bot.tenant.id;
      const tenant = await TenantService.getTenantInfo(tenantId);

      if (!tenant) {
        return await replyV2(
          interaction,
          ContainerService.simple(`❌ Tenant not found: \`${tenantId}\``, { color: '#EA5455' }),
          true
        );
      }

      const activityHistory = await TenantService.getModuleActivityHistory(tenantId, undefined, 10);

      const container = ContainerService.create({
        title: `🏢 Tenant Information: ${tenant.name}`,
        color: '#00B4DB',
        fields: [
          {
            name: '📋 Basic Info',
            value: `ID: \`${tenant.tenantId}\`\nName: **${tenant.name}**\nOwner: ${tenant.ownerId ? `<@${tenant.ownerId}>` : 'None'}\nStatus: ${tenant.details?.isVerified ? '✅ Verified' : '❌ Unverified'} ${tenant.details?.isPremium ? '| ⭐ Premium' : ''}`,
            inline: false,
          },
          {
            name: '📊 Statistics',
            value: `Guilds: **${tenant.guildCount}**\nActive Modules: **${tenant.moduleCount}**\nTotal Users: **${tenant.details?.totalUsers || 0}**`,
            inline: true,
          },
          {
            name: '🕐 Timeline',
            value: `Created: <t:${Math.floor(tenant.createdAt.getTime() / 1000)}:R>\nLast Updated: <t:${Math.floor(tenant.updatedAt.getTime() / 1000)}:R>`,
            inline: true,
          },
          ...(tenant.details?.description ? [{
            name: '📝 Description',
            value: tenant.details.description,
          }] : []),
          ...(activityHistory.length > 0 ? [{
            name: '📜 Recent Activity',
            value: activityHistory
              .slice(0, 5)
              .map((activity: any) => `• **${activity.actionType}**: ${activity.moduleName} <t:${Math.floor(activity.timestamp.getTime() / 1000)}:R>`)
              .join('\n'),
          }] : []),
        ],
        footer: true,
      });

      await replyV2(interaction, container, true);
    } catch (error) {
      await replyV2(
        interaction,
        ContainerService.simple(`❌ Error fetching tenant info: ${error}`, { color: '#EA5455' }),
        true
      );
    }
  },
};
