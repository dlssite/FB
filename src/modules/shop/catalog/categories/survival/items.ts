import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

class RationPack extends BaseItem {
  id = 'survival_rations';
  name = 'Standard Ration Pack';
  description = 'High-calorie nutritional blocks. Keeps you alive in the wastes.';
  basePrice = 50;
  rarity: Rarity = 'common';
  category = 'survival';
  emoji = '🍱';
}

class Medkit extends BaseItem {
  id = 'survival_medkit';
  name = 'Basic Medkit';
  description = 'A standard medical kit for treating minor wounds and radiation exposure.';
  basePrice = 450;
  rarity: Rarity = 'uncommon';
  category = 'survival';
  emoji = '🩹';
}

export default [new RationPack(), new Medkit()];
