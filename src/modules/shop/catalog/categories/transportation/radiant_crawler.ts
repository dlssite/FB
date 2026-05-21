import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class RadiantCrawler extends BaseItem {
  id = 'transport_radiant_crawler';
  name = 'Radiant Crawler Tank';
  description = 'Wheeled combat tank armored with radioactive shielding. Thrives in nuclear zones.';
  basePrice = 18000;
  rarity: Rarity = 'epic';
  category = 'transportation';
  emoji = '☢️';

  metadata = {
    isVehicle: true,
    speed: 95,
    handling: 60,
    fuelCapacity: 800,
    cargoSlots: 6,
    radioactiveShielding: true,
    nuclearZoneBonus: 0.50,
    heavyArmor: 0.35
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} weaponized the wastelands with a Radiant Crawler Tank.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new RadiantCrawler();
