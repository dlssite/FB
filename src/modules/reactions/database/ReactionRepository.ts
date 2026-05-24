import { prisma } from '../../../database/client';
import { Logger } from '../../../utils/logger';

export class ReactionRepository {
  /**
   * Panel Operations
   */
  static async createPanel(data: {
    guildId: string;
    tenantId: string;
    channelId: string;
    messageId?: string;
    title: string;
    description?: string;
    panelType?: string;
  }) {
    try {
      return await prisma.reaction_self_panels.create({ data });
    } catch (err) {
      Logger.error('ReactionRepository: createPanel', err);
      throw err;
    }
  }

  static async getPanelByMessageId(messageId: string, tenantId: string) {
    try {
      return await prisma.reaction_self_panels.findUnique({
        where: { messageId_tenantId: { messageId, tenantId } },
        include: { items: true }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getPanelByMessageId', err);
      throw err;
    }
  }

  static async getPanelById(panelId: number) {
    try {
      return await prisma.reaction_self_panels.findUnique({
        where: { id: panelId },
        include: { items: true }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getPanelById', err);
      throw err;
    }
  }

  static async listPanels(guildId: string, tenantId: string) {
    try {
      return await prisma.reaction_self_panels.findMany({
        where: { guildId, tenantId },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });
    } catch (err) {
      Logger.error('ReactionRepository: listPanels', err);
      throw err;
    }
  }

  static async updatePanel(panelId: number, data: Partial<{
    title: string;
    description: string;
    messageId: string;
  }>) {
    try {
      return await prisma.reaction_self_panels.update({
        where: { id: panelId },
        data,
        include: { items: true }
      });
    } catch (err) {
      Logger.error('ReactionRepository: updatePanel', err);
      throw err;
    }
  }

  static async deletePanel(panelId: number) {
    try {
      return await prisma.reaction_self_panels.delete({
        where: { id: panelId }
      });
    } catch (err) {
      Logger.error('ReactionRepository: deletePanel', err);
      throw err;
    }
  }

  /**
   * Reaction Item Operations
   */
  static async createItem(data: {
    panelId: number;
    emoji: string;
    label: string;
    description?: string;
    roleIds: string[];
    mutuallyExclusive?: boolean;
    groupId?: string;
  }) {
    try {
      return await prisma.reaction_self_items.create({
        data: {
          ...data,
          roleIds: JSON.stringify(data.roleIds)
        }
      });
    } catch (err) {
      Logger.error('ReactionRepository: createItem', err);
      throw err;
    }
  }

  static async getItem(itemId: number) {
    try {
      return await prisma.reaction_self_items.findUnique({
        where: { id: itemId }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getItem', err);
      throw err;
    }
  }

  static async getItemsByPanel(panelId: number) {
    try {
      return await prisma.reaction_self_items.findMany({
        where: { panelId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getItemsByPanel', err);
      throw err;
    }
  }

  static async updateItem(itemId: number, data: Partial<{
    emoji: string;
    label: string;
    description: string;
    roleIds: string[];
    mutuallyExclusive: boolean;
    groupId: string;
  }>) {
    try {
      const updateData = { ...data };
      if (data.roleIds) {
        (updateData as any).roleIds = JSON.stringify(data.roleIds);
      }
      return await prisma.reaction_self_items.update({
        where: { id: itemId },
        data: updateData
      });
    } catch (err) {
      Logger.error('ReactionRepository: updateItem', err);
      throw err;
    }
  }

  static async deleteItem(itemId: number) {
    try {
      return await prisma.reaction_self_items.delete({
        where: { id: itemId }
      });
    } catch (err) {
      Logger.error('ReactionRepository: deleteItem', err);
      throw err;
    }
  }

  /**
   * User Role Assignment Operations
   */
  static async assignRole(data: {
    guildId: string;
    tenantId: string;
    userId: string;
    roleId: string;
    panelId: number;
    reactionItemId: number;
    expiresAt?: Date;
  }) {
    try {
      return await prisma.reaction_self_user_roles.create({ data });
    } catch (err) {
      Logger.error('ReactionRepository: assignRole', err);
      throw err;
    }
  }

  static async removeRole(guildId: string, tenantId: string, userId: string, roleId: string) {
    try {
      return await prisma.reaction_self_user_roles.deleteMany({
        where: { guildId, tenantId, userId, roleId }
      });
    } catch (err) {
      Logger.error('ReactionRepository: removeRole', err);
      throw err;
    }
  }

  static async getUserRoles(guildId: string, tenantId: string, userId: string) {
    try {
      return await prisma.reaction_self_user_roles.findMany({
        where: { guildId, tenantId, userId }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getUserRoles', err);
      throw err;
    }
  }

  static async hasRole(guildId: string, tenantId: string, userId: string, roleId: string) {
    try {
      const record = await prisma.reaction_self_user_roles.findFirst({
        where: { guildId, tenantId, userId, roleId }
      });
      return !!record;
    } catch (err) {
      Logger.error('ReactionRepository: hasRole', err);
      throw err;
    }
  }

  static async getRolesInGroup(panelId: number, groupId: string) {
    try {
      return await prisma.reaction_self_items.findMany({
        where: { panelId, groupId }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getRolesInGroup', err);
      throw err;
    }
  }

  static async getUserRolesInGroup(guildId: string, tenantId: string, userId: string, groupId: string, panelId: number) {
    try {
      const items = await this.getRolesInGroup(panelId, groupId);
      const itemIds = items.map(item => item.id);

      return await prisma.reaction_self_user_roles.findMany({
        where: {
          guildId,
          tenantId,
          userId,
          reactionItemId: { in: itemIds }
        }
      });
    } catch (err) {
      Logger.error('ReactionRepository: getUserRolesInGroup', err);
      throw err;
    }
  }

  static async getPanelStats(panelId: number) {
    try {
      const totalAssignments = await prisma.reaction_self_user_roles.count({
        where: { panelId }
      });

      const uniqueUsers = await prisma.reaction_self_user_roles.findMany({
        where: { panelId },
        distinct: ['userId'],
        select: { userId: true }
      });

      return {
        totalAssignments,
        uniqueUsers: uniqueUsers.length
      };
    } catch (err) {
      Logger.error('ReactionRepository: getPanelStats', err);
      throw err;
    }
  }

  /**
   * Emoji Link Operations
   */
  static async linkEmoji(data: {
    guildId: string;
    tenantId: string;
    channelId: string;
    messageId: string;
    emoji: string;
    roleIds: string[];
  }) {
    try {
      return await prisma.reaction_emoji_links.upsert({
        where: {
          guildId_tenantId_messageId_emoji: {
            guildId: data.guildId,
            tenantId: data.tenantId,
            messageId: data.messageId,
            emoji: data.emoji
          }
        },
        update: {
          roleIds: JSON.stringify(data.roleIds)
        },
        create: {
          ...data,
          roleIds: JSON.stringify(data.roleIds)
        }
      });
    } catch (err) {
      Logger.error('ReactionRepository: linkEmoji', err);
      throw err;
    }
  }

  static async getEmojiLink(guildId: string, tenantId: string, messageId: string, emoji: string) {
    try {
      const link = await prisma.reaction_emoji_links.findUnique({
        where: {
          guildId_tenantId_messageId_emoji: { guildId, tenantId, messageId, emoji }
        }
      });
      
      if (link && typeof link.roleIds === 'string') {
        link.roleIds = JSON.parse(link.roleIds);
      }
      
      return link;
    } catch (err) {
      Logger.error('ReactionRepository: getEmojiLink', err);
      throw err;
    }
  }

  static async getEmojiLinksForMessage(guildId: string, tenantId: string, messageId: string) {
    try {
      const links = await prisma.reaction_emoji_links.findMany({
        where: { guildId, tenantId, messageId }
      });
      
      return links.map(link => {
        if (typeof link.roleIds === 'string') {
          link.roleIds = JSON.parse(link.roleIds);
        }
        return link;
      });
    } catch (err) {
      Logger.error('ReactionRepository: getEmojiLinksForMessage', err);
      throw err;
    }
  }

  static async unlinkEmoji(guildId: string, tenantId: string, messageId: string, emoji: string) {
    try {
      return await prisma.reaction_emoji_links.deleteMany({
        where: { guildId, tenantId, messageId, emoji }
      });
    } catch (err) {
      Logger.error('ReactionRepository: unlinkEmoji', err);
      throw err;
    }
  }

  static async getEmojiLinksByGuild(guildId: string, tenantId: string) {
    try {
      const links = await prisma.reaction_emoji_links.findMany({
        where: { guildId, tenantId }
      });
      
      return links.map(link => {
        if (typeof link.roleIds === 'string') {
          link.roleIds = JSON.parse(link.roleIds);
        }
        return link;
      });
    } catch (err) {
      Logger.error('ReactionRepository: getEmojiLinksByGuild', err);
      throw err;
    }
  }
}
