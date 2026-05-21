import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class VoidSiphon extends BaseItem {
  id = 'building_void_siphon';
  name = 'Void Energy Siphon';
  description = 'Harvests ambient void energy from mutant tears and anomalies. Unstable but powerful.';
  basePrice = 35000;
  rarity: Rarity = 'legendary';
  category = 'buildings';
  emoji = '🌀';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 1
    },
    perks: {
      voidEnergyHarvest: true,
      unstable: true,
      passiveIncome: { 
        resource: 'VOID_ENERGY',
        amount: 150, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} opened a rift with the Void Siphon. Reality stability at risk...`, 'SHOP' as any);
  }
}

export default new VoidSiphon();
