import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class MutantRunnerBike extends BaseItem {
  id = 'transport_mutant_bike';
  name = 'Mutant Runner Bike';
  description = 'High-speed maglev cycle with beast-skin armor. Agile across radioactive wastelands.';
  basePrice = 5500;
  rarity: Rarity = 'uncommon';
  category = 'transportation';
  emoji = '🏍️';

  metadata = {
    isVehicle: true,
    speed: 180,
    handling: 95,
    fuelCapacity: 200,
    cargoSlots: 1,
    beastTamed: true
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} acquired a Mutant Runner Bike. Pure adrenaline machines.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new MutantRunnerBike();
