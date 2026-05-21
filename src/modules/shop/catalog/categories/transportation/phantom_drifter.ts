import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class PhantomDrifter extends BaseItem {
  id = 'transport_phantom_drifter';
  name = 'Phantom Drifter';
  description = 'Sleek stealth vehicle with cloaking tech. Rarely detected by beast scanners.';
  basePrice = 15000;
  rarity: Rarity = 'rare';
  category = 'transportation';
  emoji = '👻';

  metadata = {
    isVehicle: true,
    speed: 140,
    handling: 88,
    fuelCapacity: 400,
    cargoSlots: 3,
    stealthMode: true,
    detectionAvoidance: 0.80
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} phased in a Phantom Drifter. Now you see it... now you don't.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new PhantomDrifter();
