import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BunkerFortress extends BaseItem {
  id = 'building_bunker_fortress';
  name = 'Armored Bunker Fortress';
  description = 'Underground reinforced bunker with blast doors and radiation shielding. Protects against beast raids and environmental hazards.';
  basePrice = 28000;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '🛡️';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 1,
      members: 8
    },
    perks: {
      defensiveBonus: 0.25,
      raidProtection: true,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 75, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} purchased a Bunker Fortress. Deploying underground stronghold...`, 'SHOP' as any);
  }
}

export default new BunkerFortress();
