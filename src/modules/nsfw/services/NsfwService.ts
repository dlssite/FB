import { prisma } from '../../../database/client';
import { NsfwApi } from '../helpers/api';

export class NsfwService {
  /**
   * Increments the total views for a user in the NSFW module.
   */
  static async incrementViews(userId: string, tenantId: string) {
    await prisma.user_nsfw_profiles.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: { totalViews: { increment: 1 }, updatedAt: new Date() },
      create: { userId, tenantId, totalViews: 1, updatedAt: new Date() }
    });
  }

  /**
   * Adds an image to the user's vault (favorites).
   */
  static async toggleFavorite(userId: string, tenantId: string, mediaUrl: string, provider: string): Promise<boolean> {
    const existing = await prisma.user_nsfw_vault.findFirst({
      where: { userId, tenantId, mediaUrl }
    });

    if (existing) {
      await prisma.user_nsfw_vault.delete({ where: { id: existing.id } });
      return false; // Removed
    } else {
      await prisma.user_nsfw_vault.create({
        data: { userId, tenantId, mediaUrl, provider, createdAt: new Date() }
      });
      return true; // Added
    }
  }

  /**
   * Gets a user's vault items.
   */
  static async getVault(userId: string, tenantId: string) {
    return await prisma.user_nsfw_vault.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  /**
   * Pre-fetches a batch of images for a smooth browsing experience.
   */
  static async getBatch(category: string, count: number = 3): Promise<string[]> {
    const results = await Promise.all(
      Array.from({ length: count }, () => NsfwApi.fetchRandom(category))
    );
    return results.filter((url): url is string => !!url);
  }
}
