import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class DataVault extends BaseItem {
  id = 'building_data_vault';
  name = 'Secured Data Vault';
  description = 'Hardened archive of pre-collapse technology and schematics. Boosts research capabilities.';
  basePrice = 21000;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '💾';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 1
    },
    perks: {
      researchBonus: 0.30,
      schematicUnlock: true,
      passiveIncome: { 
        resource: 'TECH_POINTS',
        amount: 50, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} acquired a Data Vault. Ancient technology awaits...`, 'SHOP' as any);
  }
}

export default new DataVault();
