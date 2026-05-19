import { flamebornConfig } from '../../config/flameborn.config';
import { ProfileService } from './services/ProfileService';
import { Logger } from '../../utils/logger';

export async function initProfileProviders() {
  Logger.loader('Universal Profile: Initializing distributed data providers...');

  if (flamebornConfig.modules.economy?.active) {
    const { EconomyProfileProvider } = await import('../economy/services/EconomyProfileProvider');
    const { InventoryProfileProvider } = await import('../economy/services/InventoryProfileProvider');
    ProfileService.registerProvider(new EconomyProfileProvider());
    ProfileService.registerProvider(new InventoryProfileProvider());
  }

  if (flamebornConfig.modules.leveling?.active) {
    const { LevelingProfileProvider } = await import('../leveling/services/LevelingProfileProvider');
    ProfileService.registerProvider(new LevelingProfileProvider());
  }

  if (flamebornConfig.modules.streaks?.active) {
    const { StreaksProfileProvider } = await import('../streaks/services/StreaksProfileProvider');
    ProfileService.registerProvider(new StreaksProfileProvider());
  }

  if (flamebornConfig.modules.faction?.active) {
    const { FactionProfileProvider } = await import('../faction/services/FactionProfileProvider');
    ProfileService.registerProvider(new FactionProfileProvider());
  }

  if (flamebornConfig.modules.birthday?.active) {
    const { BirthdayProfileProvider } = await import('../birthday/services/BirthdayProfileProvider');
    ProfileService.registerProvider(new BirthdayProfileProvider());
  }

  if (flamebornConfig.modules.social?.active) {
    const { SocialProfileProvider } = await import('../social/services/SocialProfileProvider');
    ProfileService.registerProvider(new SocialProfileProvider());
  }

  if (flamebornConfig.modules.territory?.active) {
    const { TerritoryProfileProvider } = await import('../territory/services/TerritoryProfileProvider');
    ProfileService.registerProvider(new TerritoryProfileProvider());
  }

  if (flamebornConfig.modules.invite?.active) {
    const { InviteProfileProvider } = await import('../invite/services/InviteProfileProvider');
    ProfileService.registerProvider(new InviteProfileProvider());
  }

  if (flamebornConfig.modules.music?.active) {
    const { MusicProfileProvider } = await import('../music/services/MusicProfileProvider');
    ProfileService.registerProvider(new MusicProfileProvider());
  }

  if (flamebornConfig.modules.booster?.active) {
    const { BoosterProfileProvider } = await import('../booster/services/BoosterProfileProvider');
    ProfileService.registerProvider(new BoosterProfileProvider());
  }

  Logger.loader(`Universal Profile: Registered ${ProfileService.getProviders().length} active module providers.`);
}
