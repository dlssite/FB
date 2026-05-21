import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class NexusNode extends BaseItem {
  id = 'building_nexus_node';
  name = 'Neural Nexus Node';
  description = 'Quantum-linked neural processor that connects to a broader intelligence network. Enhances all faction operations.';
  basePrice = 40000;
  rarity: Rarity = 'legendary';
  category = 'buildings';
  emoji = '🧠';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 1
    },
    perks: {
      globalBonus: 0.10,
      intelligenceNetwork: true,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 125, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} activated a Neural Nexus Node. Connected to the network.`, 'SHOP' as any);
  }
}

export default new NexusNode();
