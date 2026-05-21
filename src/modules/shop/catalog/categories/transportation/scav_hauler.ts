import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class HeavyScavHauler extends BaseItem {
  id = 'transport_scav_hauler';
  name = 'Heavy Scav Hauler';
  description = 'Massive cargo truck with reinforced frame. Prioritizes cargo capacity over speed.';
  basePrice = 7500;
  rarity: Rarity = 'uncommon';
  category = 'transportation';
  emoji = '🚛';

  metadata = {
    isVehicle: true,
    speed: 80,
    handling: 50,
    fuelCapacity: 1000,
    cargoSlots: 8,
    maxCarryWeight: 'extreme'
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} registered a Heavy Scav Hauler for mass resource transport.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new HeavyScavHauler();
