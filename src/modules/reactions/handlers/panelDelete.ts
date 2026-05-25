import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Logger } from '../../../../utils/logger';
import { RoutingService } from '../../../../services/RoutingService';
import { AddonService } from '../../../../services/AddonService';
import { ReactionRepository } from '../../database/ReactionRepository';
import { ReactionPanelService } from '../../services/ReactionPanelService';
import { EmbedService } from '../../../../utils/embed';
import { replyV2, ContainerService } from '../../../../utils/container';

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

  const panelId = parseInt(interaction.options.getString('panel_id', true), 10);

  try {
    const panel = await ReactionRepository.getPanelById(panelId);
    if (!panel || panel.guildId !== guildId) {
      throw new Error('Panel not found or unauthorized');
    }

    await ReactionPanelService.deletePanel(interaction.guild, panelId);

    const container = ContainerService.create({
      title: '✅ Panel Deleted',
      description: `Panel **${panel.title}** has been deleted`,
      color: '#28C76F',
      footer: true
    });

    return await replyV2(interaction, container);
  } catch (err: any) {
    Logger.error('Panel Delete Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to delete panel',
      'PANEL_DELETE_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
