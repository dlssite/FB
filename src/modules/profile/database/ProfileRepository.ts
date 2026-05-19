import { prisma } from '../../../database/client';

export class ProfileRepository {
  /**
   * Retrieves or initializes a user's profile record.
   */
  static async getProfile(tenantId: string, userId: string) {
    let profile = await prisma.user_profiles.findUnique({
      where: {
        userId_tenantId: { userId, tenantId }
      }
    });

    if (!profile) {
      profile = await prisma.user_profiles.create({
        data: {
          tenantId,
          userId,
          privacyMode: false,
          unlockedColor: false,
          unlockedBanner: false,
          unlockedPrivacy: false
        }
      });
    }

    return profile;
  }

  /**
   * Updates a user's profile fields.
   */
  static async updateProfile(tenantId: string, userId: string, data: Partial<Parameters<typeof prisma.user_profiles.update>[0]['data']>) {
    return await prisma.user_profiles.update({
      where: {
        userId_tenantId: { userId, tenantId }
      },
      data
    });
  }
}
