import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class BunkerFortress extends BaseItem {
  id = 'building_bunker_fortress';
  name = 'Armored Bunker Fortress';
  description = 'Underground reinforced bunker with blast doors and radiation shielding. Protects against beast raids and environmental hazards.';
  basePrice = 28000;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '🛡️';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 1,
      members: 8
    },
    perks: {
      defensiveBonus: 0.25,
      raidProtection: true,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 75, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} purchased a Bunker Fortress. Deploying underground stronghold...`, 'SHOP' as any);
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
        emoji: '🛡️'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Bunker Fortress',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#34495E',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new BunkerFortress();
