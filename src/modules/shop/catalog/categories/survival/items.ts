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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_rations', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '🍱 Rations Consumed',
      description: `You consumed a **Standard Ration Pack**. Nutrition restored and hunger satisfied for 8 hours.`,
      color: '#F39C12',
      footer: true,
      interaction
    }), true);
  }
}

class Medkit extends BaseItem {
  id = 'survival_medkit';
  name = 'Basic Medkit';
  description = 'A standard medical kit for treating minor wounds and radiation exposure.';
  basePrice = 2500;
  rarity: Rarity = 'uncommon';
  category = 'survival';
  emoji = '🩹';

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_medkit', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '🩹 Medical Treatment Applied',
      description: `You used a **Basic Medkit**. Wounds treated and health restored by 50%.`,
      color: '#2ECC71',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_beast_blood', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '🧪 BEAST BLOOD SURGE!',
      description: `You consumed a **Beast Blood Vial**!\n\n⚡ **+15% Strength Boost** for **1 hour**\n⚠️ Minor mutations detected (cosmetic only).`,
      color: '#E74C3C',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_rad_filter', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '💨 Radiation Protection Activated',
      description: `You equipped the **Radiation Filter Pack**!\n\n🛡️ **80% Radiation Resistance** activated for **8 hours**.\nYou can now safely traverse irradiated zones.`,
      color: '#9B59B6',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '💧 Crystal Canteen Equipped',
      description: `You equipped the **Synth-Crystal Canteen**!\n\n💜 This reusable item allows unlimited water purification.\nCarry it with you to convert any water source into safe drinking water.`,
      color: '#3498DB',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    const usesRemaining = (instance.metadata?.usesRemaining || 3) - 1;
    if (usesRemaining <= 0) {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_emergency_kit', -1);
      return await replyV2(interaction, ContainerService.create({
        title: '🎒 Emergency Kit Depleted',
        description: `The kit has been consumed completely. Final use restored **50% health**. The item has been removed from your inventory.`,
        color: '#F39C12',
        footer: true,
        interaction
      }), true);
    }

    return await replyV2(interaction, ContainerService.create({
      title: '🎒 Emergency Kit Deployed',
      description: `You used the **Emergency Survival Kit**!\n\n✅ Health restored by **50%**\n📦 **${usesRemaining} uses** remaining.\nRope, tools, and signaling beacon deployed.`,
      color: '#F39C12',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '✨ Arcane Protection Enabled',
      description: `You equipped the **Arcane Resonance Stone**!\n\n🔮 **40% Magical Defense** activated (permanent).\n✨ Enchantment Level: 3\nProtected from magical damage.`,
      color: '#8E44AD',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    const mutations = [
      { name: 'Enhanced Vision', icon: '👁️', benefit: 'See in darkness' },
      { name: 'Regeneration', icon: '🩹', benefit: 'Slow health regeneration' },
      { name: 'Thickened Skin', icon: '🛡️', benefit: '+20% Physical Defense' },
      { name: 'Thermal Sense', icon: '🔥', benefit: 'Detect heat signatures' },
      { name: 'Sonic Adaptation', icon: '🔊', benefit: 'Echolocation abilities' }
    ];
    
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_mutation_serum', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '🧬 MUTATION ACQUIRED!',
      description: `You injected the **Controlled Mutation Serum**!\n\n${mutation.icon} **New Mutation: ${mutation.name}**\nBenefit: ${mutation.benefit}\n\n⚠️ This mutation is now permanent.`,
      color: '#16A085',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '😷 Void Protection Activated',
      description: `You equipped the **Void-Protection Mask**!\n\n🕳️ **60% Void Resistance** activated.\n✨ Prevents void energy corruption.\n🎭 Plus, you look absolutely mysterious and menacing!`,
      color: '#2C3E50',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_decontam_pod', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '🛁 FULL DECONTAMINATION CYCLE COMPLETE',
      description: `You activated the **Personal Decontamination Pod**!\n\n✅ All toxins removed\n✅ Radiation completely purged\n✅ All debuffs cleared\n\n**Item consumed.** You feel pristine.`,
      color: '#1ABC9C',
      footer: true,
      interaction
    }), true);
  }
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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    await EconomyRepository.updateItemQuantity(tenantId, userId, 'survival_nourish_paste', -1);
    
    return await replyV2(interaction, ContainerService.create({
      title: '💪 Nourishment Consumed',
      description: `You consumed the **Concentrated Nourishment Paste**!\n\n🍽️ Health restored by **25%**\n⏰ Hunger satisfied for **7 days**\n💥 Energy surge detected.`,
      color: '#F39C12',
      footer: true,
      interaction
    }), true);
  }
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
