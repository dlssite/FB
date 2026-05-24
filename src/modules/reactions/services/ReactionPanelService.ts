import { Guild, TextChannel, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, Message } from 'discord.js';
import { ReactionRepository } from '../database/ReactionRepository';
import { ContainerService, sendV2 } from '../../../utils/container';
import { Logger } from '../../../utils/logger';

export class ReactionPanelService {
  /**
   * Create and deploy a reaction panel
   */
  static async deployPanel(
    guild: Guild,
    channelId: string,
    panelData: {
      tenantId: string;
      title: string;
      description?: string;
      items: Array<{
        emoji: string;
        label: string;
        description?: string;
        roleIds: string[];
        mutuallyExclusive?: boolean;
        groupId?: string;
      }>;
    }
  ) {
    try {
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildText) {
        throw new Error('Invalid channel');
      }

      // Create panel in database
      const panel = await ReactionRepository.createPanel({
        guildId: guild.id,
        tenantId: panelData.tenantId,
        channelId,
        title: panelData.title,
        description: panelData.description,
        panelType: 'dropdown'
      });

      // Create items
      for (const itemData of panelData.items) {
        await ReactionRepository.createItem({
          panelId: panel.id,
          emoji: itemData.emoji,
          label: itemData.label,
          description: itemData.description,
          roleIds: itemData.roleIds,
          mutuallyExclusive: itemData.mutuallyExclusive || false,
          groupId: itemData.groupId
        });
      }

      // Build dropdown menu
      const selectMenu = await this.buildSelectMenu(panel.id);

      // Create embed and send message
      const container = ContainerService.create({
        title: panelData.title,
        description: panelData.description || 'Select roles to add yourself:',
        color: '#7c3aed',
        footer: true,
        components: [selectMenu]
      });

      const message = await sendV2(channel as any, container);
      
      // Save message ID
      await ReactionRepository.updatePanel(panel.id, { messageId: message.id });

      return {
        panelId: panel.id,
        messageId: message.id,
        itemCount: panelData.items.length
      };
    } catch (err) {
      Logger.error('ReactionPanelService: deployPanel', err);
      throw err;
    }
  }

  /**
   * Build StringSelectMenu from panel items
   */
  static async buildSelectMenu(panelId: number): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    try {
      const items = await ReactionRepository.getItemsByPanel(panelId);

      const options = items.map(item =>
        new StringSelectMenuOptionBuilder()
          .setLabel(item.label)
          .setValue(item.id.toString())
          .setDescription(item.description || `Select for ${item.label}`)
          .setEmoji(item.emoji)
      );

      const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`reaction_select_${panelId}`)
            .setPlaceholder('Choose a role to add...')
            .addOptions(options)
            .setMaxValues(1)
        );

      return selectMenu;
    } catch (err) {
      Logger.error('ReactionPanelService: buildSelectMenu', err);
      throw err;
    }
  }

  /**
   * Delete a panel and remove message
   */
  static async deletePanel(guild: Guild, panelId: number) {
    try {
      const panel = await ReactionRepository.getPanelById(panelId);
      if (!panel) throw new Error('Panel not found');

      // Try to delete the message
      if (panel.messageId) {
        const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
        if (channel && channel.type === ChannelType.GuildText) {
          try {
            const message = await (channel as TextChannel).messages.fetch(panel.messageId);
            await message.delete();
          } catch (err) {
            Logger.warn(`Failed to delete panel message for panel ${panelId}`);
          }
        }
      }

      // Delete from database (cascades to items and user roles)
      await ReactionRepository.deletePanel(panelId);

      return true;
    } catch (err) {
      Logger.error('ReactionPanelService: deletePanel', err);
      throw err;
    }
  }

  /**
   * Get panel info with formatting
   */
  static async getPanelInfo(panelId: number) {
    try {
      const panel = await ReactionRepository.getPanelById(panelId);
      if (!panel) throw new Error('Panel not found');

      const stats = await ReactionRepository.getPanelStats(panelId);

      return {
        id: panel.id,
        title: panel.title,
        description: panel.description,
        channelId: panel.channelId,
        messageId: panel.messageId,
        itemCount: panel.items.length,
        ...stats,
        createdAt: panel.createdAt
      };
    } catch (err) {
      Logger.error('ReactionPanelService: getPanelInfo', err);
      throw err;
    }
  }

  /**
   * Update panel message content
   */
  static async updatePanelMessage(guild: Guild, panelId: number) {
    try {
      const panel = await ReactionRepository.getPanelById(panelId);
      if (!panel || !panel.messageId) throw new Error('Panel or message not found');

      const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
      if (!channel || channel.type !== ChannelType.GuildText) throw new Error('Invalid channel');

      const message = await (channel as TextChannel).messages.fetch(panel.messageId).catch(() => null);
      if (!message) throw new Error('Message not found');

      const selectMenu = await this.buildSelectMenu(panelId);
      const container = ContainerService.create({
        title: panel.title,
        description: panel.description || 'Select roles to add yourself:',
        color: '#7c3aed',
        footer: true,
        components: [selectMenu]
      });

      await message.edit(container);
      return true;
    } catch (err) {
      Logger.error('ReactionPanelService: updatePanelMessage', err);
      throw err;
    }
  }
}
