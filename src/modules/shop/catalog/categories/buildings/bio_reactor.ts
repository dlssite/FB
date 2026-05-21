import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BioReactor extends BaseItem {
  id = 'building_bio_reactor';
  name = 'Bio-Reactor Module';
  description = 'Converts organic beast remains into power. Generates substantial energy income.';
  basePrice = 18500;
  rarity: Rarity = 'rare';
  category = 'buildings';
  emoji = '⚡';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 2
    },
    perks: {
      energyGeneration: true,
      beastMaterialProcessing: true,
      passiveIncome: { 
        resource: 'ENERGY',
        amount: 100, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} deployed a Bio-Reactor for sustainable power generation.`, 'SHOP' as any);
  }
}

export default new BioReactor();
