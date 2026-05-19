import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class ModularOutpost extends BaseItem {
  id = 'building_outpost_kit';
  name = 'Modular Outpost Kit';
  description = 'A complete deployment package for a small frontier outpost. Includes perimeter sensors and basic shielding.';
  basePrice = 150;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '🏯';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 2,
      members: 5
    },
    perks: {
      xpBonus: 0.15,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 50, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} purchased an Outpost Kit. Ready for deployment in a designated zone.`, 'SHOP' as any);
  }

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { TerritoryRepository } = await import('../../../../territory/database/TerritoryRepository');
    const { ActionRowBuilder, StringSelectMenuBuilder } = await import('discord.js');

    const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
    if (!nations.length) {
      return await replyV2(interaction, ContainerService.simple('❌ No designated Nations found in this sector to deploy the outpost.'));
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`deploy_building_${instance.instanceId}`)
      .setPlaceholder('🌍 Select deployment location...')
      .addOptions(nations.map((n: any) => ({
        label: n.name,
        value: n.id.toString(),
        emoji: '🏳️'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Modular Outpost',
      description: 'Select the Nation where you wish to deploy this outpost kit. **Warning: This will consume the item.**',
      color: '#F39C12',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new ModularOutpost();
