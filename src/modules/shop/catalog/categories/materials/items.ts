import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

class ScrapMetal extends BaseItem {
  id = 'material_scrap_metal';
  name = 'Scrap Metal';
  description = 'Rusted but usable metal fragments. Essential for basic crafting.';
  basePrice = 150;
  rarity: Rarity = 'common';
  category = 'materials';
  emoji = '🔩';
}

class SalvagedCircuitry extends BaseItem {
  id = 'material_circuitry';
  name = 'Salvaged Circuitry';
  description = 'Complex boards salvaged from pre-collapse terminals. Highly valuable for tech upgrades.';
  basePrice = 1200;
  rarity: Rarity = 'rare';
  category = 'materials';
  emoji = '🔌';
}

export default [new ScrapMetal(), new SalvagedCircuitry()];
