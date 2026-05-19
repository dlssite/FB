import { prisma } from '../../../database/client';

export class AiRepository {
  static async getSettings(guildId: string, tenantId: string) {
    return prisma.ai_settings.findUnique({
      where: {
        guildId_tenantId: { guildId, tenantId }
      }
    });
  }

  static async upsertSettings(guildId: string, tenantId: string, data: any) {
    return prisma.ai_settings.upsert({
      where: {
        guildId_tenantId: { guildId, tenantId }
      },
      update: data,
      create: {
        guildId,
        tenantId,
        ...data
      }
    });
  }

  static async addMemory(tenantId: string, guildId: string, userId: string, factType: string, factKey: string, factValue: string, confidence: number = 1.0) {
    return prisma.ai_memories.create({
      data: {
        tenantId,
        guildId,
        userId,
        factType,
        factKey,
        factValue,
        confidence
      }
    });
  }

  static async getMemories(tenantId: string, guildId: string, userId: string) {
    return prisma.ai_memories.findMany({
      where: {
        tenantId,
        guildId,
        userId
      },
      orderBy: {
        confidence: 'desc'
      }
    });
  }

  static async deleteMemory(id: number, tenantId: string) {
    return prisma.ai_memories.deleteMany({
      where: {
        id,
        tenantId
      }
    });
  }
}
