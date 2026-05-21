import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class ShadowStalker extends BaseItem {
  id = 'transport_shadow_stalker';
  name = 'Shadow Stalker Cycle';
  description = 'Sleek dark-matter powered vehicle. Designed for covert operations and precise strikes.';
  basePrice = 14000;
  rarity: Rarity = 'rare';
  category = 'transportation';
  emoji = '🌑';

  metadata = {
    isVehicle: true,
    speed: 155,
    handling: 92,
    fuelCapacity: 350,
    cargoSlots: 2,
    darkMatterTech: true,
    silentMode: true,
    evasion: 0.30
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} merged with shadows via the Shadow Stalker Cycle.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new ShadowStalker();
