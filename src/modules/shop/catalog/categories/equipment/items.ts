import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

class PortableBeacon extends BaseItem {
  id = 'equipment_beacon';
  name = 'Portable Beacon';
  description = 'Deploys a temporary signal to mark your position or interest points.';
  basePrice = 9500;
  rarity: Rarity = 'rare';
  category = 'equipment';
  emoji = '🛰️';
}

class ReinforcedPlating extends BaseItem {
  id = 'equipment_plating';
  name = 'Reinforced Plating';
  description = 'High-density metal alloy plates for reinforcing shelters or vehicles.';
  basePrice = 32000;
  rarity: Rarity = 'epic';
  category = 'equipment';
  emoji = '🛡️';
}

class QuantumProcessor extends BaseItem {
  id = 'tech_quantum_processor';
  name = 'Quantum Processing Core';
  description = 'Cutting-edge processor for AI systems and advanced machinery. Enables complex calculations instantly.';
  basePrice = 15000;
  rarity: Rarity = 'rare';
  category = 'equipment';
  emoji = '💻';

  metadata = {
    component: true,
    computingPower: 'extreme',
    usedIn: ['crafting', 'research', 'ai_systems']
  };
}

class ChromaPlating extends BaseItem {
  id = 'tech_chroma_plating';
  name = 'Chromatic Armor Plating';
  description = 'Advanced alloy that adapts to energy types. Reinforces weapons and armor effectively.';
  basePrice = 8000;
  rarity: Rarity = 'uncommon';
  category = 'equipment';
  emoji = '⚙️';

  metadata = {
    component: true,
    armorValue: 35,
    usedIn: ['armor_crafting', 'vehicle_upgrade']
  };
}

class NeuralMatrix extends BaseItem {
  id = 'tech_neural_matrix';
  name = 'Synthetic Neural Matrix';
  description = 'Bio-synthetic processor that mimics organic thought patterns. Used in advanced AI and beast control systems.';
  basePrice = 25000;
  rarity: Rarity = 'epic';
  category = 'equipment';
  emoji = '🧠';

  metadata = {
    component: true,
    aiCapability: true,
    beastControl: true,
    usedIn: ['high_tier_ai', 'sentient_systems']
  };
}

class PhaseCrystal extends BaseItem {
  id = 'tech_phase_crystal';
  name = 'Phase-Shift Crystal';
  description = 'Rare crystal that allows matter to phase through barriers. Critical for stealth technology.';
  basePrice = 18000;
  rarity: Rarity = 'rare';
  category = 'equipment';
  emoji = '💠';

  metadata = {
    component: true,
    rarity: 'rare',
    usedIn: ['stealth_tech', 'dimensional_shifts', 'teleportation']
  };
}

class VoidResonator extends BaseItem {
  id = 'tech_void_resonator';
  name = 'Void Resonance Amplifier';
  description = 'Exotic component that resonates with void energy. Powers dimensional rifts and reality warping tech.';
  basePrice = 38000;
  rarity: Rarity = 'legendary';
  category = 'equipment';
  emoji = '🌀';

  metadata = {
    component: true,
    powerLevel: 'legendary',
    usedIn: ['void_tech', 'dimensional_tech', 'warp_drives']
  };
}

class BioSynthFluid extends BaseItem {
  id = 'tech_biosynth_fluid';
  name = 'Bio-Synthetic Coolant';
  description = 'Genetically engineered coolant that keeps machinery operating at peak efficiency. Never overheats.';
  basePrice = 11500;
  rarity: Rarity = 'rare';
  category = 'equipment';
  emoji = '🧫';

  metadata = {
    component: true,
    consumable: true,
    coolantCapacity: 100,
    usedIn: ['high_performance_engines', 'weapons', 'research']
  };
}

class EchoFragment extends BaseItem {
  id = 'tech_echo_fragment';
  name = 'Echo Fragment';
  description = 'Shard of ancient technology that amplifies signals and communications. Grants enhanced range.';
  basePrice = 5500;
  rarity: Rarity = 'uncommon';
  category = 'equipment';
  emoji = '📡';

  metadata = {
    component: true,
    communicationBoost: 0.50,
    rangeMultiplier: 2,
    usedIn: ['communication_arrays', 'beacons', 'radar']
  };
}

class MagnetiteIngot extends BaseItem {
  id = 'tech_magnetite_ingot';
  name = 'Rare Magnetite Ingot';
  description = 'Highly magnetic metal from deep radiation zones. Essential for energy systems and propulsion.';
  basePrice = 4500;
  rarity: Rarity = 'common';
  category = 'equipment';
  emoji = '🧲';

  metadata = {
    component: true,
    magneticField: true,
    usedIn: ['energy_systems', 'maglev', 'weapons']
  };
}

class CatalystShard extends BaseItem {
  id = 'tech_catalyst_shard';
  name = 'Reaction Catalyst Shard';
  description = 'Accelerates chemical and magical reactions. Used to speed up crafting processes.';
  basePrice = 12000;
  rarity: Rarity = 'rare';
  category = 'equipment';
  emoji = '⚡';

  metadata = {
    component: true,
    craftingSpeedup: 0.60,
    reactionAccelerator: true,
    usedIn: ['crafting', 'potion_brewing', 'alchemy']
  };
}

class DarkMatterCanister extends BaseItem {
  id = 'tech_dark_matter_canister';
  name = 'Dark Matter Containment Unit';
  description = 'Stabilized dark matter in a secure container. Used for advanced weaponry and dimensional tech.';
  basePrice = 45000;
  rarity: Rarity = 'legendary';
  category = 'equipment';
  emoji = '⬛';

  metadata = {
    component: true,
    powerLevel: 'extreme',
    usedIn: ['weapons', 'dimensional_tech', 'energy_weapons']
  };
}

export default [
  new PortableBeacon(),
  new ReinforcedPlating(),
  new QuantumProcessor(),
  new ChromaPlating(),
  new NeuralMatrix(),
  new PhaseCrystal(),
  new VoidResonator(),
  new BioSynthFluid(),
  new EchoFragment(),
  new MagnetiteIngot(),
  new CatalystShard(),
  new DarkMatterCanister()
];
