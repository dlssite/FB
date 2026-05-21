import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class CrystalGarden extends BaseItem {
  id = 'building_crystal_garden';
  name = 'Synth-Crystal Garden';
  description = 'Cultivates rare synthetic crystals used in advanced technology and magical artifacts.';
  basePrice = 16500;
  rarity: Rarity = 'rare';
  category = 'buildings';
  emoji = '💎';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 2
    },
    perks: {
      crystalProduction: true,
      craftingBonus: 0.20,
      passiveIncome: { 
        resource: 'SYNTH_CRYSTALS',
        amount: 40, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} planted a Synth-Crystal Garden for resource generation.`, 'SHOP' as any);
  }
}

export default new CrystalGarden();
