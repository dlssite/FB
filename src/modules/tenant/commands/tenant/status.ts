import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TenantService } from '../../../../services/TenantService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('status')
      .setDescription('Show current tenant and guild status'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const currentTenantId = flamebornConfig.bot.tenant.id;
      const tenant = await TenantService.getTenantInfo(currentTenantId);
      const modules = await TenantService.getTenantModules(currentTenantId);
      const config = flamebornConfig;

      if (!tenant) {
        return await replyV2(
          interaction,
          ContainerService.simple('❌ Current tenant not found', { color: '#EA5455' }),
          true
        );
      }

      const activeModules = modules.filter((m: any) => m.isActive);
      const fields = [
        {
          name: '📍 Tenant Details',
          value: `Name: **${tenant.name}**\nID: \`${tenant.tenantId}\`\nBot Instance: **${config.bot.id}**`,
          inline: false,
        },
        {
          name: '📊 Metrics',
          value: `Guilds: **${tenant.guildCount}**\nActive Modules: **${activeModules.length}**\nTotal Modules Configured: **${modules.length}**\nTotal Users: **${tenant.details?.totalUsers || 0}**`,
          inline: true,
        },
        {
          name: '⚙️ Configuration',
          value: `Status: ${tenant.details?.isVerified ? '✅ Verified' : '❌ Unverified'}\nPremium: ${tenant.details?.isPremium ? '⭐ Yes' : '❌ No'}\nOwner: ${tenant.ownerId ? `<@${tenant.ownerId}>` : 'None'}`,
          inline: true,
        },
      ];

      if (activeModules.length > 0) {
        const moduleList = activeModules
          .slice(0, 15)
          .map((m: any) => `• ${m.moduleName}`)
          .join('\n');

        fields.push({
          name: `✅ Active Modules (${activeModules.length})`,
          value: moduleList || 'None',
          inline: false,
        });
      }

      const container = ContainerService.create({
        title: '🏢 Current Tenant Status',
        color: '#00B4DB',
        fields,
        footer: true,
      });

      await replyV2(interaction, container, true);
    } catch (error) {
      await replyV2(
        interaction,
        ContainerService.simple(`❌ Error fetching status: ${error}`, { color: '#EA5455' }),
        true
      );
    }
  },
};
