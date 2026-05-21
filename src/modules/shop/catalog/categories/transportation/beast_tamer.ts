import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BeastTamer extends BaseItem {
  id = 'transport_beast_tamer';
  name = 'Beast Tamer Mech';
  description = 'Massive exoskeleton that harnesses mutant beast power for propulsion. Feeds on consumed creatures.';
  basePrice = 22000;
  rarity: Rarity = 'epic';
  category = 'transportation';
  emoji = '🤖';

  metadata = {
    isVehicle: true,
    speed: 130,
    handling: 65,
    fuelCapacity: null,
    cargoSlots: 5,
    beastPowered: true,
    organicFuel: 'mutant_remains',
    defensiveStats: 0.40
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} bonded with a Beast Tamer Mech. Creature power unleashed.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new BeastTamer();
