import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Logger } from '../../../../utils/logger';
import { RoutingService } from '../../../../services/RoutingService';
import { AddonService } from '../../../../services/AddonService';
import { ReactionRepository } from '../../database/ReactionRepository';
import { RoleAssignmentService } from '../../services/RoleAssignmentService';
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
  const emoji = interaction.options.getString('emoji', true);
  const label = interaction.options.getString('label', true);
  const role = interaction.options.getRole('role', true);
  const groupId = interaction.options.getString('group_id');
  const isExclusive = interaction.options.getBoolean('exclusive') || false;

  try {
    const panel = await ReactionRepository.getPanelById(panelId);
    if (!panel || panel.guildId !== guildId) {
      throw new Error('Panel not found');
    }

    // Validate role
    const { valid } = await RoleAssignmentService.validateRoles(interaction.guild, [role.id]);
    if (!valid.includes(role.id)) {
      throw new Error('Invalid role or bot cannot manage it');
    }

    // Create item
    const item = await ReactionRepository.createItem({
      panelId,
      emoji,
      label,
      roleIds: [role.id],
      mutuallyExclusive: isExclusive,
      groupId: groupId || undefined
    });

    // Update panel message
    await ReactionPanelService.updatePanelMessage(interaction.guild, panelId);

    const container = ContainerService.create({
      title: '✅ Item Added',
      description: `Added ${emoji} **${label}** → <@&${role.id}>`,
      color: '#28C76F',
      footer: true
    });

    return await replyV2(interaction, container);
  } catch (err: any) {
    Logger.error('Item Add Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to add item',
      'ITEM_ADD_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
