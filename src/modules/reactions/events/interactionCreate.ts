import { Interaction, MessageFlags, StringSelectMenuInteraction } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { ReactionService } from '../services/ReactionService';
import { ReactionRepository } from '../database/ReactionRepository';
import { replyV2, ContainerService } from '../../../utils/container';
import { EmbedService } from '../../../utils/embed';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'reactions');

    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'reactions');
    if (!isEnabled) return;

    // Handle Dropdown Select for reaction selection
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('reaction_select_')
    ) {
      await interaction.deferReply({
        flags: (MessageFlags.IsComponentsV2 as any || 32768) | (MessageFlags.Ephemeral as any || 64)
      });

      const panelIdStr = interaction.customId.replace('reaction_select_', '');
      const panelId = parseInt(panelIdStr, 10);
      const itemIdStr = interaction.values[0];
      const itemId = parseInt(itemIdStr, 10);

      try {
        // Validate panel
        const isValid = await ReactionService.validatePanel(guildId, panelId);
        if (!isValid) {
          throw new Error('Invalid or expired panel');
        }

        // Check permission
        if (!ReactionService.checkPanelCreatePermission(interaction.member as any)) {
          // User can still self-assign
        }

        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member) throw new Error('Member not found');

        // Assign roles
        const result = await ReactionService.assignReactionRoles(
          member,
          panelId,
          itemId,
          tenantId
        );

        // Build response
        let description = '✅ ';
        if (result.assigned.length > 0) {
          description += `Added ${result.assigned.length} role(s)`;
        }
        if (result.removed.length > 0) {
          description += ` | Removed ${result.removed.length} role(s)`;
        }
        if (result.assigned.length === 0 && result.removed.length === 0) {
          description += 'No changes made';
        }

        const container = ContainerService.create({
          title: 'Role Assignment',
          description,
          color: '#28C76F',
          footer: true
        });

        return await replyV2(interaction, container);
      } catch (err: any) {
        Logger.error('Reaction Selection Error', err);
        const errorContainer = EmbedService.containerError(
          err.message || 'An error occurred while assigning roles',
          'REACTION_SELECT_ERR'
        );
        return await replyV2(interaction, errorContainer);
      }
    }
  }
};
