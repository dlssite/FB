import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class VoidShip extends BaseItem {
  id = 'transport_void_ship';
  name = 'Void Battleship';
  description = 'Ancient void-tech warship that tears through dimensional barriers. Can access shortcut routes.';
  basePrice = 35000;
  rarity: Rarity = 'legendary';
  category = 'transportation';
  emoji = '⚔️';

  metadata = {
    isVehicle: true,
    speed: 200,
    handling: 75,
    fuelCapacity: 2000,
    cargoSlots: 10,
    voidTech: true,
    dimensionalShortcuts: true,
    weaponized: true
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} commandeered a Void Battleship. Reality itself bends...`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new VoidShip();
