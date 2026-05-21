import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class IceBreaker extends BaseItem {
  id = 'transport_ice_breaker';
  name = 'Ice Breaker Hovercraft';
  description = 'All-terrain hovercraft that traverses frozen tundras, toxic swamps, and unstable terrain.';
  basePrice = 12000;
  rarity: Rarity = 'rare';
  category = 'transportation';
  emoji = '❄️';

  metadata = {
    isVehicle: true,
    speed: 110,
    handling: 70,
    fuelCapacity: 600,
    cargoSlots: 4,
    terrainAdaptation: ['ice', 'swamp', 'toxic'],
    allTerrainBonus: 0.25
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} floated into a new era with the Ice Breaker Hovercraft.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new IceBreaker();
