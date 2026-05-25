import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';
import { ReactionRepository } from '../../database/ReactionRepository';
import { ReactionPanelService } from '../../services/ReactionPanelService';
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

  const itemId = parseInt(interaction.options.getString('item_id', true), 10);

  try {
    const item = await ReactionRepository.getItem(itemId);
    if (!item) throw new Error('Item not found');

    const panel = await ReactionRepository.getPanelById(item.panelId);
    if (!panel || panel.guildId !== guildId) {
      throw new Error('Panel not found or unauthorized');
    }

    // Delete item (cascades from database)
    await ReactionRepository.deleteItem(itemId);

    // Update panel message
    await ReactionPanelService.updatePanelMessage(interaction.guild, item.panelId);

    const container = ContainerService.create({
      title: '✅ Item Removed',
      description: `Removed item from panel`,
      color: '#28C76F',
      footer: true
    });

    return await replyV2(interaction, container);
  } catch (err: any) {
    Logger.error('Item Remove Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to remove item',
      'ITEM_REMOVE_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
