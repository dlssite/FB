import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { TenantService } from '../../../services/TenantService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('modules')
      .setDescription('List all modules and their tenant assignments')
      .addStringOption(opt =>
        opt
          .setName('tenant')
          .setDescription('Filter by specific tenant ID')
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const filterTenantId = interaction.options.getString('tenant');

      if (filterTenantId) {
        // Show modules for specific tenant
        const modules = await TenantService.getTenantModules(filterTenantId);

        if (modules.length === 0) {
          return await replyV2(
            interaction,
            ContainerService.simple(
              `No modules configured for tenant \`${filterTenantId}\``,
              { color: '#FFB703' }
            ),
            true
          );
        }

        const activeModules = modules.filter((m: any) => m.isActive);
        const inactiveModules = modules.filter((m: any) => !m.isActive);

        const fields = [];
        if (activeModules.length > 0) {
          fields.push({
            name: `✅ Active Modules (${activeModules.length})`,
            value: activeModules.map((m: any) => `• **${m.moduleName}**`).join('\n') || 'None',
            inline: false,
          });
        }

        if (inactiveModules.length > 0) {
          fields.push({
            name: `⏸️ Inactive Modules (${inactiveModules.length})`,
            value: inactiveModules.map((m: any) => `• ~~${m.moduleName}~~`).join('\n') || 'None',
            inline: false,
          });
        }

        const container = ContainerService.create({
          title: `📦 Modules for Tenant: ${filterTenantId}`,
          description: `Total Modules: **${modules.length}**`,
          color: '#00B4DB',
          fields,
          footer: true,
        });

        return await replyV2(interaction, container, true);
      }

      // Show all modules across all tenants
      const moduleStats = await TenantService.getModuleStatistics();
      const allModules = Object.keys(flamebornConfig.modules || {});

      // Create a table-like view
      let moduleList = '';
      for (const moduleName of allModules.slice(0, 20)) {
        const stat = moduleStats.get(moduleName);
        if (stat) {
          moduleList += `• **${moduleName}**: Active in ${stat.active} tenant${stat.active !== 1 ? 's' : ''}\n`;
        } else {
          moduleList += `• **${moduleName}**: Not configured\n`;
        }
      }

      const fields = [
        {
          name: 'Module Overview',
          value: moduleList || 'No modules configured',
          inline: false,
        }
      ];

      if (allModules.length > 20) {
        fields.push({
          name: '⚠️ Additional Modules',
          value: `Showing 20 of ${allModules.length} modules. Use filter option to see specific tenants.`,
          inline: false,
        });
      }

      const container = ContainerService.create({
        title: '📦 All Modules & Tenant Assignments',
        description: `Total Modules: **${allModules.length}**\nConfigured: **${moduleStats.size}**`,
        color: '#00B4DB',
        fields,
        footer: true,
      });

      await replyV2(interaction, container, true);
    } catch (error) {
      await replyV2(
        interaction,
        ContainerService.simple(`❌ Error listing modules: ${error}`, { color: '#EA5455' }),
        true
      );
    }
  },
};
