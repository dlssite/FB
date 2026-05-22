import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BeastArena extends BaseItem {
  id = 'building_beast_arena';
  name = 'Beast Containment Arena';
  description = 'Reinforced arena for capturing and studying mutated beasts. Generates valuable research materials.';
  basePrice = 24000;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '🐉';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 1,
      members: 5
    },
    perks: {
      beastCapture: true,
      researchBonus: 0.15,
      passiveIncome: { 
        resource: 'RESEARCH_MATERIAL',
        amount: 60, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} constructed a Beast Arena for specimen study.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ActionRowBuilder, StringSelectMenuBuilder } = await import('discord.js');
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { TerritoryRepository } = await import('../../../../territory/database/TerritoryRepository');

    const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
    if (!nations.length) {
      return await replyV2(interaction, ContainerService.simple('❌ No designated Nations found in this sector to deploy the building.'));
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`deploy_building_${instance.instanceId}`)
      .setPlaceholder('🌍 Select deployment location...')
      .addOptions(nations.map((n: any) => ({
        label: n.name,
        value: n.id.toString(),
        emoji: '🐉'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Beast Arena',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#E74C3C',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new BeastArena();
