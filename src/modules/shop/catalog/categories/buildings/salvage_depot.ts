import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class SalvageDepot extends BaseItem {
  id = 'building_salvage_depot';
  name = 'Industrial Salvage Depot';
  description = 'Processing facility for recovering and refurbishing old-world technology and materials.';
  basePrice = 12000;
  rarity: Rarity = 'uncommon';
  category = 'buildings';
  emoji = '♻️';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 2,
      members: 4
    },
    perks: {
      salvageProcessing: true,
      materialRecovery: true,
      passiveIncome: { 
        resource: 'SCRAP_MATERIALS',
        amount: 45, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} deployed a Salvage Depot. Beginning recovery operations.`, 'SHOP' as any);
  }
}

export default new SalvageDepot();
