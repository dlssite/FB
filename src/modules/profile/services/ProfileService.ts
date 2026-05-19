import { ProfileProvider } from './ProfileProvider';
import { ProfileRepository } from '../database/ProfileRepository';
import { EconomyRepository } from '../../economy/database/EconomyRepository';
import { LedgerService } from '../../economy/services/LedgerService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';

export class ProfileService {
  private static providers: ProfileProvider[] = [];

  /**
   * Registers a data provider from an active module.
   */
  static registerProvider(provider: ProfileProvider) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
    Logger.loader(`[Profile] Registered provider from module [${provider.moduleName}] with priority ${provider.priority}`);
  }

  /**
   * Retrieves all registered providers.
   */
  static getProviders(): ProfileProvider[] {
    return this.providers;
  }

  /**
   * Compiles all UI fields for the V2 Container profile display.
   */
  static async getProfileContainerFields(tenantId: string, guildId: string, userId: string) {
    const fields: { name: string; value: string; inline?: boolean; moduleName?: string }[] = [];

    for (const provider of this.providers) {
      try {
        const providerFields = await provider.getContainerFields(tenantId, guildId, userId);
        providerFields.forEach(f => fields.push({ ...f, moduleName: provider.moduleName }));
      } catch (err) {
        Logger.error(`[Profile] Provider [${provider.moduleName}] failed to get container fields for ${userId}`, err);
      }
    }

    return fields;
  }

  /**
   * Compiles raw structured data for the AI Manifest.
   */
  static async getProfileAiData(tenantId: string, guildId: string, userId: string) {
    const aiData: Record<string, any> = {};

    for (const provider of this.providers) {
      try {
        const data = await provider.getAiData(tenantId, guildId, userId);
        aiData[provider.moduleName] = data;
      } catch (err) {
        Logger.error(`[Profile] Provider [${provider.moduleName}] failed to get AI data for ${userId}`, err);
      }
    }

    return aiData;
  }

  /**
   * Updates user bio.
   */
  static async updateBio(tenantId: string, userId: string, bio: string) {
    const cleanBio = bio.substring(0, 200); // Enforce length limit
    await ProfileRepository.getProfile(tenantId, userId);
    return await ProfileRepository.updateProfile(tenantId, userId, { bio: cleanBio });
  }

  /**
   * Updates admin title.
   */
  static async updateAdminTitle(tenantId: string, userId: string, title: string | null) {
    await ProfileRepository.getProfile(tenantId, userId);
    return await ProfileRepository.updateProfile(tenantId, userId, { adminTitle: title });
  }

  /**
   * Unlocks a premium profile feature using Embers.
   */
  static async unlockFeature(tenantId: string, userId: string, feature: 'customColor' | 'customBanner' | 'privacyMode') {
    const profile = await ProfileRepository.getProfile(tenantId, userId);
    
    const flagMap = {
      customColor: 'unlockedColor',
      customBanner: 'unlockedBanner',
      privacyMode: 'unlockedPrivacy'
    } as const;

    const flag = flagMap[feature];
    if (profile[flag]) {
      throw new Error('ALREADY_UNLOCKED');
    }

    const price = flamebornConfig.profile.unlockPrices[feature];
    const userEco = await EconomyRepository.getUser(tenantId, userId);
    const currentEmbers = Number(userEco?.embers || 0);

    if (currentEmbers < price) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Deduct balance
    await EconomyRepository.updateBalance(tenantId, userId, { embers: -price });
    await LedgerService.log({
      tenantId,
      userId,
      type: 'LOSS',
      category: 'PROFILE_UNLOCK',
      amount: price,
      reason: `Unlocked premium profile feature: ${feature}`
    });

    // Update profile unlock flag
    return await ProfileRepository.updateProfile(tenantId, userId, { [flag]: true });
  }

  /**
   * Applies custom color.
   */
  static async setCustomColor(tenantId: string, userId: string, color: string | null) {
    const profile = await ProfileRepository.getProfile(tenantId, userId);
    if (!profile.unlockedColor && color !== null) {
      throw new Error('NOT_UNLOCKED');
    }
    return await ProfileRepository.updateProfile(tenantId, userId, { customColor: color });
  }

  /**
   * Applies custom banner.
   */
  static async setCustomBanner(tenantId: string, userId: string, banner: string | null) {
    const profile = await ProfileRepository.getProfile(tenantId, userId);
    if (!profile.unlockedBanner && banner !== null) {
      throw new Error('NOT_UNLOCKED');
    }
    return await ProfileRepository.updateProfile(tenantId, userId, { customBanner: banner });
  }

  /**
   * Toggles privacy mode.
   */
  static async togglePrivacyMode(tenantId: string, userId: string) {
    const profile = await ProfileRepository.getProfile(tenantId, userId);
    if (!profile.unlockedPrivacy) {
      throw new Error('NOT_UNLOCKED');
    }
    const newMode = !profile.privacyMode;
    await ProfileRepository.updateProfile(tenantId, userId, { privacyMode: newMode });
    return newMode;
  }
}
