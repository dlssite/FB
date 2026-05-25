import { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';
import { ReactionRepository } from '../database/ReactionRepository';
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

  try {
    const panels = await ReactionRepository.listPanels(guildId, tenantId);

    if (panels.length === 0) {
      const container = ContainerService.create({
        title: 'No Panels',
        description: 'No reaction panels found. Create one with `/reactions panel create`',
        color: '#6b7280',
        footer: true
      });
      return await replyV2(interaction, container);
    }

    const fields = panels.map((panel: any) => ({
      name: `${panel.title} (ID: ${panel.id})`,
      value: `📝 ${panel.items.length} roles | <#${panel.channelId}>\n${panel.description || 'No description'}`,
      inline: false
    }));

    const container = ContainerService.create({
      title: '📋 Reaction Panels',
      description: `Total panels: ${panels.length}`,
      fields,
      color: '#7c3aed',
      footer: true
    });

    return await replyV2(interaction, container);
  } catch (err: any) {
    Logger.error('Panel List Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to list panels',
      'PANEL_LIST_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
