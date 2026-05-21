import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BeastArena extends BaseItem {
  id = 'building_beast_arena';
  name = 'Beast Containment Arena';
  description = 'Reinforced arena for capturing and studying mutated beasts. Generates valuable research materials.';
  basePrice = 24000;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '🐉';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 1,
      members: 5
    },
    perks: {
      beastCapture: true,
      researchBonus: 0.15,
      passiveIncome: { 
        resource: 'RESEARCH_MATERIAL',
        amount: 60, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} constructed a Beast Arena for specimen study.`, 'SHOP' as any);
  }
}

export default new BeastArena();
