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

  /**
   * Check if this is a user's first interaction (first visit detection)
   */
  static async isFirstVisit(tenantId: string, guildId: string, userId: string): Promise<boolean> {
    const existingMemories = await prisma.ai_memories.findFirst({
      where: {
        tenantId,
        guildId,
        userId,
        factType: 'SYSTEM',
        factKey: 'PROFILE_INITIALIZED'
      }
    });

    return !existingMemories;
  }

  /**
   * Record a user's first visit
   */
  static async recordFirstVisit(tenantId: string, guildId: string, userId: string) {
    return prisma.ai_memories.create({
      data: {
        tenantId,
        guildId,
        userId,
        factType: 'SYSTEM',
        factKey: 'PROFILE_INITIALIZED',
        factValue: new Date().toISOString(),
        confidence: 1.0
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
