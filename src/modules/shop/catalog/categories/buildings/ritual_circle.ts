import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class RitualCircle extends BaseItem {
  id = 'building_ritual_circle';
  name = 'Ancient Ritual Circle';
  description = 'Mysterious site of old-world magic enhanced by post-collapse mutations. Grants temporary blessings and buffs.';
  basePrice = 14500;
  rarity: Rarity = 'rare';
  category = 'buildings';
  emoji = '🔮';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 6
    },
    perks: {
      magicalEnhancement: true,
      buffGeneration: true,
      passiveIncome: { 
        resource: 'ARCANE_ENERGY',
        amount: 35, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} activated a Ritual Circle. Arcane forces converge...`, 'SHOP' as any);
  }
}

export default new RitualCircle();
