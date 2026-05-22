import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class NexusNode extends BaseItem {
  id = 'building_nexus_node';
  name = 'Neural Nexus Node';
  description = 'Quantum-linked neural processor that connects to a broader intelligence network. Enhances all faction operations.';
  basePrice = 40000;
  rarity: Rarity = 'legendary';
  category = 'buildings';
  emoji = '🧠';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 1
    },
    perks: {
      globalBonus: 0.10,
      intelligenceNetwork: true,
      passiveIncome: { 
        resource: 'NATION_RESOURCE',
        amount: 125, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} activated a Neural Nexus Node. Connected to the network.`, 'SHOP' as any);
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
        emoji: '🧠'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Neural Nexus Node',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#2980B9',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new NexusNode();
