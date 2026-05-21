import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class WingGlider extends BaseItem {
  id = 'transport_wing_glider';
  name = 'Synth-Wing Glider';
  description = 'Aerodynamic aircraft with synthetic crystal-enhanced wings. Fast and silent traversal.';
  basePrice = 10000;
  rarity: Rarity = 'uncommon';
  category = 'transportation';
  emoji = '🦅';

  metadata = {
    isVehicle: true,
    speed: 165,
    handling: 85,
    fuelCapacity: 300,
    cargoSlots: 2,
    aerial: true,
    silentMode: true
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} took to the skies with a Synth-Wing Glider.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new WingGlider();
