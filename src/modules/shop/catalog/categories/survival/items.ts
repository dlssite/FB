import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

class RationPack extends BaseItem {
  id = 'survival_rations';
  name = 'Standard Ration Pack';
  description = 'High-calorie nutritional blocks. Keeps you alive in the wastes.';
  basePrice = 1500;
  rarity: Rarity = 'common';
  category = 'survival';
  emoji = '🍱';
}

class Medkit extends BaseItem {
  id = 'survival_medkit';
  name = 'Basic Medkit';
  description = 'A standard medical kit for treating minor wounds and radiation exposure.';
  basePrice = 2500;
  rarity: Rarity = 'uncommon';
  category = 'survival';
  emoji = '🩹';
}

class BeastBloodVial extends BaseItem {
  id = 'survival_beast_blood';
  name = 'Beast Blood Vial';
  description = 'Potent mutant blood that grants temporary strength boost when consumed. Side effects include minor mutations.';
  basePrice = 2000;
  rarity: Rarity = 'common';
  category = 'survival';
  emoji = '🧪';
  
  metadata = {
    consumable: true,
    buffType: 'strength',
    duration: 3600,
    strengthBoost: 0.15
  };
}

class RadiationFilter extends BaseItem {
  id = 'survival_rad_filter';
  name = 'Radiation Filter Pack';
  description = 'Advanced filtration system for breathing suits. Allows safe traversal through irradiated zones.';
  basePrice = 4500;
  rarity: Rarity = 'uncommon';
  category = 'survival';
  emoji = '💨';
  
  metadata = {
    equipment: true,
    radiationResistance: 0.80,
    durationHours: 8
  };
}

class CrystalCanteen extends BaseItem {
  id = 'survival_crystal_canteen';
  name = 'Synth-Crystal Canteen';
  description = 'Water container infused with purifying crystals. Converts toxic liquids into drinkable fluid.';
  basePrice = 3500;
  rarity: Rarity = 'uncommon';
  category = 'survival';
  emoji = '💧';
  
  metadata = {
    equipment: true,
    waterPurification: true,
    reusable: true,
    capacity: 'unlimited'
  };
}

class SurvivalKit extends BaseItem {
  id = 'survival_emergency_kit';
  name = 'Emergency Survival Kit';
  description = 'Complete package: rope, tools, signaling beacon, and survival guides from the old world.';
  basePrice = 7000;
  rarity: Rarity = 'rare';
  category = 'survival';
  emoji = '🎒';
  
  metadata = {
    consumable: true,
    multiUse: true,
    usesRemaining: 3,
    restoresHealth: 0.50,
    emergency: true
  };
}

class ArcaneStone extends BaseItem {
  id = 'survival_arcane_stone';
  name = 'Arcane Resonance Stone';
  description = 'Mystical crystal that pulses with protective energy. Shields wearer from magical damage.';
  basePrice = 8500;
  rarity: Rarity = 'rare';
  category = 'survival';
  emoji = '✨';
  
  metadata = {
    wearable: true,
    magicalDefense: 0.40,
    duration: 'permanent',
    enchantmentLevel: 3
  };
}

class MutationSerum extends BaseItem {
  id = 'survival_mutation_serum';
  name = 'Controlled Mutation Serum';
  description = 'Carefully crafted serum for voluntary beneficial mutations. Grants one random positive mutation.';
  basePrice = 12000;
  rarity: Rarity = 'epic';
  category = 'survival';
  emoji = '🧬';
  
  metadata = {
    consumable: true,
    mutagenic: true,
    effectType: 'permanent_mutation',
    rarity: 'epic'
  };
}

class VoidMask extends BaseItem {
  id = 'survival_void_mask';
  name = 'Void-Protection Mask';
  description = 'Ancient artifact mask that protects against void energy corruption. Stunning appearance included.';
  basePrice = 9000;
  rarity: Rarity = 'rare';
  category = 'survival';
  emoji = '😷';
  
  metadata = {
    wearable: true,
    voidResistance: 0.60,
    preventCorruption: true,
    fashionable: true
  };
}

class DecontaminationPod extends BaseItem {
  id = 'survival_decontam_pod';
  name = 'Personal Decontamination Pod';
  description = 'Portable chamber that removes toxins and radiation in minutes. Single-use item.';
  basePrice = 11000;
  rarity: Rarity = 'epic';
  category = 'survival';
  emoji = '🛁';
  
  metadata = {
    consumable: true,
    singleUse: true,
    removesDebuffs: true,
    cleansesAllToxins: true,
    radiationCure: true
  };
}

class NourishmentPaste extends BaseItem {
  id = 'survival_nourish_paste';
  name = 'Concentrated Nourishment Paste';
  description = 'Super-dense nutrition in small packets. One jar can sustain a person for a week.';
  basePrice = 1800;
  rarity: Rarity = 'common';
  category = 'survival';
  emoji = '💪';
  
  metadata = {
    consumable: true,
    servings: 10,
    restoresHealth: 0.25,
    hungerReduction: 'week'
  };
}

export default [
  new RationPack(),
  new Medkit(),
  new BeastBloodVial(),
  new RadiationFilter(),
  new CrystalCanteen(),
  new SurvivalKit(),
  new ArcaneStone(),
  new MutationSerum(),
  new VoidMask(),
  new DecontaminationPod(),
  new NourishmentPaste()
];
