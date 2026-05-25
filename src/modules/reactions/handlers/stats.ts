import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';
import { ReactionRepository } from '../database/ReactionRepository';
import { ReactionPanelService } from '../services/ReactionPanelService';
import { EmbedService } from '../../../utils/embed';
import { replyV2, ContainerService } from '../../../utils/container';

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const tenantId = await RoutingService.resolveTenantId(guildId, 'reactions');

  const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'reactions');
  if (!isEnabled) {
    const errorContainer = EmbedService.containerError('Reactions module is not enabled', 'ADDON_DISABLED');
    return await replyV2(interaction, errorContainer);
  }

  const panelIdOpt = interaction.options.getString('panel_id');

  try {
    if (panelIdOpt) {
      const panelId = parseInt(panelIdOpt, 10);
      const info = await ReactionPanelService.getPanelInfo(panelId);

      const fields = [
        { name: 'Panel ID', value: info.id.toString(), inline: true },
        { name: 'Roles', value: info.itemCount.toString(), inline: true },
        { name: 'Assigned Roles', value: info.totalAssignments.toString(), inline: true },
        { name: 'Unique Users', value: info.uniqueUsers.toString(), inline: true }
      ];

      const container = ContainerService.create({
        title: `📊 ${info.title}`,
        description: info.description || undefined,
        fields,
        color: '#7c3aed',
        footer: true
      });

      return await replyV2(interaction, container);
    } else {
      const panels = await ReactionRepository.listPanels(guildId, tenantId);

      if (panels.length === 0) {
        const container = ContainerService.create({
          title: 'No Panels',
          description: 'No reaction panels found',
          color: '#6b7280',
          footer: true
        });
        return await replyV2(interaction, container);
      }

      let totalRoles = 0;
      let totalAssignments = 0;
      const fields = [];

      for (const panel of panels) {
        const stats = await ReactionRepository.getPanelStats(panel.id);
        totalRoles += panel.items.length;
        totalAssignments += stats.totalAssignments;

        fields.push({
          name: `${panel.title} (ID: ${panel.id})`,
          value: `📝 ${panel.items.length} roles | 👥 ${stats.uniqueUsers} users | 🎯 ${stats.totalAssignments} assignments`,
          inline: false
        });
      }

      const container = ContainerService.create({
        title: '📊 Reaction Panel Statistics',
        description: `Total Panels: ${panels.length} | Total Roles: ${totalRoles} | Total Assignments: ${totalAssignments}`,
        fields,
        color: '#7c3aed',
        footer: true
      });

      return await replyV2(interaction, container);
    }
  } catch (err: any) {
    Logger.error('Stats Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to get statistics',
      'STATS_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
