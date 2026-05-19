import { prisma } from '../../../database/client';

export class ModmailRepository {
  /**
   * Retrieves modmail settings for a specific tenant and guild
   */
  static async getSettings(tenantId: string, guildId: string) {
    return await prisma.modmail_settings.upsert({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      update: {},
      create: {
        guildId,
        tenantId,
        enabled: false,
      },
    });
  }

  /**
   * Toggles Modmail on or off
   */
  static async updateSettings(tenantId: string, guildId: string, data: Partial<any>) {
    return await prisma.modmail_settings.update({
      where: {
        guildId_tenantId: {
          guildId,
          tenantId,
        },
      },
      data,
    });
  }

  /**
   * Gets an active ticket for a user
   */
  static async getActiveTicketByUser(tenantId: string, guildId: string, userId: string) {
    return await prisma.modmail_tickets.findFirst({
      where: {
        tenantId,
        guildId,
        userId,
        status: { not: 'closed' },
      },
    });
  }

  /**
   * Gets an active ticket by Thread ID
   */
  static async getTicketByThread(tenantId: string, threadId: string) {
    return await prisma.modmail_tickets.findFirst({
      where: {
        tenantId,
        threadId,
      },
    });
  }

  /**
   * Creates a new Modmail ticket
   */
  static async createTicket(tenantId: string, guildId: string, userId: string, category: string = 'General') {
    return await prisma.modmail_tickets.create({
      data: {
        tenantId,
        guildId,
        userId,
        category,
      },
    });
  }

  /**
   * Updates an existing ticket (status, threadId, claiming)
   */
  static async updateTicket(tenantId: string, ticketId: number, data: any) {
    return await prisma.modmail_tickets.updateMany({
      where: {
        id: ticketId,
        tenantId,
      },
      data,
    });
  }

  /**
   * Adds a message to the ticket log
   */
  static async addMessage(tenantId: string, ticketId: number, senderId: string, content: string, isInternal: boolean, maskedIdentity?: string) {
    return await prisma.modmail_messages.create({
      data: {
        tenantId,
        ticketId,
        senderId,
        content,
        isInternal,
        maskedIdentity,
      },
    });
  }

  /**
   * Retrieves all messages for a ticket (for transcripts)
   */
  static async getMessages(tenantId: string, ticketId: number) {
    return await prisma.modmail_messages.findMany({
      where: {
        ticketId,
        tenantId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Snippets: Gets a macro by name
   */
  static async getSnippet(tenantId: string, guildId: string, name: string) {
    return await prisma.modmail_snippets.findUnique({
      where: {
        guildId_tenantId_name: {
          guildId,
          tenantId,
          name,
        },
      },
    });
  }

  /**
   * Snippets: Upserts a macro
   */
  static async saveSnippet(tenantId: string, guildId: string, name: string, content: string) {
    return await prisma.modmail_snippets.upsert({
      where: {
        guildId_tenantId_name: {
          guildId,
          tenantId,
          name,
        },
      },
      update: { content },
      create: {
        tenantId,
        guildId,
        name,
        content,
      },
    });
  }

  /**
   * Deletes a macro
   */
  static async deleteSnippet(tenantId: string, guildId: string, name: string) {
    return await prisma.modmail_snippets.deleteMany({
      where: {
        tenantId,
        guildId,
        name,
      },
    });
  }

  /**
   * Categories: Gets a category by name
   */
  static async getCategoryByName(tenantId: string, guildId: string, name: string) {
    return await prisma.modmail_categories.findUnique({
      where: {
        guildId_tenantId_name: {
          guildId,
          tenantId,
          name,
        },
      },
    });
  }

  /**
   * Categories: Saves or updates a category ping role
   */
  static async saveCategory(tenantId: string, guildId: string, name: string, pingRoleId: string | null) {
    return await prisma.modmail_categories.upsert({
      where: {
        guildId_tenantId_name: {
          guildId,
          tenantId,
          name,
        },
      },
      update: { pingRoleId },
      create: {
        tenantId,
        guildId,
        name,
        pingRoleId,
      },
    });
  }
}
