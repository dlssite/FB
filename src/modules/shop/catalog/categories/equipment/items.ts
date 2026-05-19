import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

class PortableBeacon extends BaseItem {
  id = 'equipment_beacon';
  name = 'Portable Beacon';
  description = 'Deploys a temporary signal to mark your position or interest points.';
  basePrice = 2500;
  rarity: Rarity = 'rare';
  category = 'equipment';
  emoji = '🛰️';
}

class ReinforcedPlating extends BaseItem {
  id = 'equipment_plating';
  name = 'Reinforced Plating';
  description = 'High-density metal alloy plates for reinforcing shelters or vehicles.';
  basePrice = 8500;
  rarity: Rarity = 'epic';
  category = 'equipment';
  emoji = '🛡️';
}

export default [new PortableBeacon(), new ReinforcedPlating()];
