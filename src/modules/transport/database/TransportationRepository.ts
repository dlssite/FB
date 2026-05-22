import { prisma } from '../../../database/client';

export class TransportationRepository {
  /**
   * TRAVEL OPERATIONS
   */
  static async createTravel(tenantId: string, guildId: string, data: { userId: string, toNationId: number, vehicleInstanceId?: string | null, arrivalTime: Date }) {
    return await prisma.transport_user_travel.create({
      data: {
        tenantId,
        guildId,
        userId: data.userId,
        toNationId: data.toNationId,
        vehicleInstanceId: data.vehicleInstanceId || undefined,
        departureTime: new Date(),
        arrivalTime: data.arrivalTime,
        status: 'traveling',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  static async getActiveTravel(tenantId: string, guildId: string, userId: string) {
    return await prisma.transport_user_travel.findFirst({
      where: { tenantId, guildId, userId, status: 'traveling' }
    });
  }

  static async getPendingArrivals() {
    return await prisma.transport_user_travel.findMany({
      where: {
        status: 'traveling',
        arrivalTime: { lte: new Date() }
      }
    });
  }

  static async updateTravelStatus(id: number, status: string) {
    return await prisma.transport_user_travel.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });
  }

  /**
   * PORTAL OPERATIONS
   */
  static async createPortal(tenantId: string, guildId: string, data: any) {
    return await prisma.transport_portals.create({
      data: {
        tenantId,
        guildId,
        name: data.name,
        creatorId: data.creatorId,
        type: data.type,
        channelId: data.channelId,
        messageId: data.messageId,
        destinationNationId: data.destinationNationId,
        maxUses: data.maxUses,
        currentUses: 0,
        status: 'open',
        expirationTime: data.expirationTime,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  static async getPortalByMessage(guildId: string, messageId: string, nationId: number) {
    return await prisma.transport_portals.findFirst({
      where: { guildId, messageId, destinationNationId: nationId }
    });
  }

  static async incrementPortalUses(id: number) {
    return await prisma.transport_portals.update({
      where: { id },
      data: { 
        currentUses: { increment: 1 },
        updatedAt: new Date()
      }
    });
  }

  static async getPortalsInMessage(messageId: string) {
    return await prisma.transport_portals.findMany({
      where: { messageId }
    });
  }
}
