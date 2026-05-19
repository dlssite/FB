import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class ScoutRover extends BaseItem {
  id = 'transport_scout_rover';
  name = 'Aegis Scout Rover';
  description = 'A rugged, all-terrain rover designed for high-speed scouting across the wastes.';
  basePrice = 250;
  rarity: Rarity = 'rare';
  category = 'transportation';
  emoji = '🚜';
  
  // Custom metadata for the vehicle system
  metadata = {
    isVehicle: true, // Flags this item for discovery by the Transport Module
    speed: 120,
    handling: 85,
    fuelCapacity: 500,
    cargoSlots: 2
  };

  /**
   * Complex Hook: This is where we will eventually register the ship in the Hyperion DB.
   */
  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[HYPERION_INTEGRATION] User ${userId} has acquired a Scout Rover. Registering in fleet database...`, 'SHOP' as any);
  }

  /**
   * Action Engine: Using a vehicle directly from inventory launches the Travel Console.
   */
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    return TransportationService.renderTravelConsole(interaction, tenantId, guildId, userId, undefined, instance.instanceId);
  }
}

export default new ScoutRover();
