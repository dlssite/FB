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

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🔩 Crafting Material',
      description: `**${instance.name}** is a basic crafting material.\n\nUse this in crafting recipes for:\n• Basic Metalwork\n• Simple Tools\n• Structural Components\n\nIt cannot be used directly on its own.`,
      color: '#7F8C8D',
      footer: true,
      interaction
    }), true);
  }
}

class SalvagedCircuitry extends BaseItem {
  id = 'material_circuitry';
  name = 'Salvaged Circuitry';
  description = 'Complex boards salvaged from pre-collapse terminals. Highly valuable for tech upgrades.';
  basePrice = 1200;
  rarity: Rarity = 'rare';
  category = 'materials';
  emoji = '🔌';

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    return await replyV2(interaction, ContainerService.create({
      title: '🔌 Crafting Material',
      description: `**${instance.name}** is a rare crafting material.\n\nUse this in crafting recipes for:\n• Electronic Components\n• Tech Upgrades\n• Advanced Machinery\n• AI Systems\n\nIt cannot be used directly on its own.`,
      color: '#3498DB',
      footer: true,
      interaction
    }), true);
  }
}

export default [new ScrapMetal(), new SalvagedCircuitry()];
