import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class ScrapTower extends BaseItem {
  id = 'building_scrap_tower';
  name = 'Scrap Metal Watch Tower';
  description = 'A towering structure built from salvaged machine parts. Grants heightened surveillance range and early beast detection.';
  basePrice = 10000;
  rarity: Rarity = 'uncommon';
  category = 'buildings';
  emoji = '🗼';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 3
    },
    perks: {
      surveillanceBonus: 0.20,
      earlyWarning: true,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 30, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} deployed a Scrap Watch Tower for reconnaissance.`, 'SHOP' as any);
  }
}

export default new ScrapTower();
