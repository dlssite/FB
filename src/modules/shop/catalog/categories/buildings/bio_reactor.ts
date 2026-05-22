import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BioReactor extends BaseItem {
  id = 'building_bio_reactor';
  name = 'Bio-Reactor Module';
  description = 'Converts organic beast remains into power. Generates substantial energy income.';
  basePrice = 18500;
  rarity: Rarity = 'rare';
  category = 'buildings';
  emoji = '⚡';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 2
    },
    perks: {
      energyGeneration: true,
      beastMaterialProcessing: true,
      passiveIncome: { 
        resource: 'ENERGY',
        amount: 100, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} deployed a Bio-Reactor for sustainable power generation.`, 'SHOP' as any);
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
        emoji: '⚡'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Bio-Reactor',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#F1C40F',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new BioReactor();
