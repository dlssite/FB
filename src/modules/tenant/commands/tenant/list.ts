import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TenantService } from '../../../../services/TenantService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('list')
      .setDescription('List all tenants in the database'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const tenants = await TenantService.listAllTenants();

      if (tenants.length === 0) {
        return await replyV2(
          interaction,
          ContainerService.simple('No tenants found in the database.', { color: '#FFB703' }),
          true
        );
      }

      const fields = [];
      for (const tenant of tenants.slice(0, 24)) {
        const status = tenant.details?.isVerified
          ? tenant.details.isPremium
            ? '⭐ Premium'
            : '✅ Verified'
          : '❌ Unverified';

        fields.push({
          name: `${tenant.name} ${status}`,
          value: `ID: \`${tenant.tenantId}\`\nGuilds: **${tenant.guildCount}**\nActive Modules: **${tenant.moduleCount}**\nCreated: <t:${Math.floor(tenant.createdAt.getTime() / 1000)}:R>`,
          inline: false,
        });
      }

      if (tenants.length > 24) {
        fields.push({
          name: '⚠️ Additional Tenants',
          value: `Showing 24 of ${tenants.length} tenants. Use \`/tenant info\` to view specific tenant details.`,
        });
      }

      const container = ContainerService.create({
        title: '🏢 All Tenants',
        description: `Total Tenants: **${tenants.length}**`,
        color: '#00B4DB',
        fields,
        footer: true,
      });

      await replyV2(interaction, container, true);
    } catch (error) {
      await replyV2(
        interaction,
        ContainerService.simple(`❌ Error listing tenants: ${error}`, { color: '#EA5455' }),
        true
      );
    }
  },
};
