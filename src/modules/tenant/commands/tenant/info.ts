import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TenantService } from '../../../../services/TenantService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

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
      const tenantId = interaction.options.getString('tenant') || flamebornConfig.bot.tenant.id;
      const tenant = await TenantService.getTenantInfo(tenantId);

      if (!tenant) {
        return await replyV2(
          interaction,
          ContainerService.simple(`❌ Tenant not found: \`${tenantId}\``, { color: '#EA5455' }),
          true
        );
      }

      const modules = await TenantService.getTenantModules(tenantId);
      const activeModules = modules.filter((m: any) => m.isActive);

      const fields = [
        {
          name: '📍 Basic Information',
          value: `Name: **${tenant.name}**\nID: \`${tenant.tenantId}\`\nOwner: ${tenant.ownerId ? `<@${tenant.ownerId}>` : 'None'}`,
          inline: false,
        },
        {
          name: '📊 Statistics',
          value: `Guilds: **${tenant.guildCount}**\nActive Modules: **${activeModules.length}**\nTotal Users: **${tenant.details?.totalUsers || 0}**`,
          inline: true,
        },
        {
          name: '⚙️ Status',
          value: `Verified: ${tenant.details?.isVerified ? '✅ Yes' : '❌ No'}\nPremium: ${tenant.details?.isPremium ? '⭐ Yes' : '❌ No'}`,
          inline: true,
        },
      ];

      if (activeModules.length > 0) {
        const moduleList = activeModules
          .slice(0, 10)
          .map((m: any) => `• ${m.moduleName}`)
          .join('\n');

        fields.push({
          name: `✅ Active Modules (${activeModules.length})`,
          value: moduleList || 'None',
          inline: false,
        });
      }

      const createdAt = new Date(tenant.createdAt);
      const updatedAt = new Date(tenant.updatedAt);

      fields.push({
        name: '📅 Dates',
        value: `Created: <t:${Math.floor(createdAt.getTime() / 1000)}:R>\nUpdated: <t:${Math.floor(updatedAt.getTime() / 1000)}:R>`,
        inline: false,
      });

      const container = ContainerService.create({
        title: `🏢 ${tenant.name}`,
        color: '#00B4DB',
        fields,
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
