import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class ScrapTower extends BaseItem {
  id = 'building_scrap_tower';
  name = 'Scrap Metal Watch Tower';
  description = 'A towering structure built from salvaged machine parts. Grants heightened surveillance range and early beast detection.';
  basePrice = 10000;
  rarity: Rarity = 'uncommon';
  category = 'buildings';
  emoji = '🗼';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 3
    },
    perks: {
      surveillanceBonus: 0.20,
      earlyWarning: true,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 30, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} deployed a Scrap Watch Tower for reconnaissance.`, 'SHOP' as any);
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
        emoji: '🗼'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Scrap Watch Tower',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#F39C12',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new ScrapTower();
