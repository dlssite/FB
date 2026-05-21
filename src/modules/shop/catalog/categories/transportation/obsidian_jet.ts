import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class ObsidianJet extends BaseItem {
  id = 'transport_obsidian_jet';
  name = 'Obsidian Combat Jet';
  description = 'Experimental hypersonic combat aircraft. Dominating skies with advanced weaponry.';
  basePrice = 32000;
  rarity: Rarity = 'legendary';
  category = 'transportation';
  emoji = '✈️';

  metadata = {
    isVehicle: true,
    speed: 250,
    handling: 80,
    fuelCapacity: 1200,
    cargoSlots: 4,
    aerial: true,
    hypersonic: true,
    weaponized: true,
    combatStats: 0.60
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} took control of an Obsidian Combat Jet. Skies will never be the same.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new ObsidianJet();
