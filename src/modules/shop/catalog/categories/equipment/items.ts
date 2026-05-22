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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🛰️ Beacon Deployed',
      description: `You deployed the **Portable Beacon**!\n\n📍 Signal active and marking your location.\n📡 The beacon can be detected by nearby allies and navigation systems.`,
      color: '#E67E22',
      footer: true,
      interaction
    }), true);
  }
}

class ReinforcedPlating extends BaseItem {
  id = 'equipment_plating';
  name = 'Reinforced Plating';
  description = 'High-density metal alloy plates for reinforcing shelters or vehicles.';
  basePrice = 32000;
  rarity: Rarity = 'epic';
  category = 'equipment';
  emoji = '🛡️';

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🛡️ Crafting Material',
      description: `**${instance.name}** is a crafting component.\n\nUse this in crafting recipes to reinforce shelters, vehicles, or armor.\nIt cannot be used directly on its own.`,
      color: '#7F8C8D',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '💻 Crafting Material',
      description: `**${instance.name}** is a high-tech crafting component.\n\nUse this in crafting recipes for:\n• AI Systems\n• Advanced Research\n• Complex Machinery\n\nIt cannot be used directly on its own.`,
      color: '#3498DB',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '⚙️ Crafting Material',
      description: `**${instance.name}** is a crafting component.\n\nUse this in crafting recipes for:\n• Armor Upgrades\n• Vehicle Reinforcement\n• Weapon Enhancement\n\nIt cannot be used directly on its own.`,
      color: '#9B59B6',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🧠 Advanced Crafting Material',
      description: `**${instance.name}** is a highly advanced crafting component.\n\nUse this in crafting recipes for:\n• Sentient AI Systems\n• Beast Control Devices\n• Advanced Consciousness Systems\n\nThis is an epic-tier component. It cannot be used directly on its own.`,
      color: '#E74C3C',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '💠 Crafting Material',
      description: `**${instance.name}** is a rare crafting component.\n\nUse this in crafting recipes for:\n• Stealth Technology\n• Dimensional Portals\n• Teleportation Devices\n\nIt cannot be used directly on its own.`,
      color: '#9B59B6',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🌀 LEGENDARY CRAFTING MATERIAL',
      description: `**${instance.name}** is a legendary crafting component of immense power!\n\nUse this in crafting recipes for:\n• Void-Rift Generators\n• Reality Warping Devices\n• Dimensional Warp Drives\n• Universe-Bending Technology\n\nThis legendary component cannot be used directly on its own.`,
      color: '#8E44AD',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🧫 Crafting Material',
      description: `**${instance.name}** is a specialized crafting component.\n\nUse this in crafting recipes for:\n• High-Performance Engines\n• Weapons Systems\n• Research Equipment\n\nIt cannot be used directly on its own.`,
      color: '#1ABC9C',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '📡 Crafting Material',
      description: `**${instance.name}** is a communications crafting component.\n\nUse this in crafting recipes for:\n• Communication Arrays\n• Signal Beacons\n• Radar Systems\n\nIt cannot be used directly on its own.`,
      color: '#3498DB',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🧲 Crafting Material',
      description: `**${instance.name}** is a crafting component.\n\nUse this in crafting recipes for:\n• Energy Systems\n• Maglev Propulsion\n• Magnetic Weapons\n\nIt cannot be used directly on its own.`,
      color: '#F39C12',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '⚡ Crafting Material',
      description: `**${instance.name}** is a reaction catalyst crafting component.\n\nUse this in crafting recipes for:\n• Accelerated Crafting\n• Potion Brewing\n• Alchemical Reactions\n\nIt cannot be used directly on its own.`,
      color: '#F1C40F',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '⬛ LEGENDARY CRAFTING MATERIAL',
      description: `**${instance.name}** is a legendary-tier crafting component!\n\nUse this in crafting recipes for:\n• Exotic Weaponry\n• Dimensional Technology\n• Energy Weapons of Immense Power\n\nHandle with extreme caution. This component cannot be used directly on its own.`,
      color: '#2C3E50',
      footer: true,
      interaction
    }), true);
  }
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
