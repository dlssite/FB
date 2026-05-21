import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class DronePlatform extends BaseItem {
  id = 'building_drone_platform';
  name = 'Autonomous Drone Platform';
  description = 'Launch pad for autonomous AI drones that gather resources and conduct reconnaissance missions.';
  basePrice = 420;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '🛸';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 4,
      members: 1
    },
    perks: {
      droneDeployment: true,
      automatedMissions: true,
      passiveIncome: { 
        resource: 'RESOURCES',
        amount: 80, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} constructed a Drone Platform. AI swarms activated.`, 'SHOP' as any);
  }
}

export default new DronePlatform();
