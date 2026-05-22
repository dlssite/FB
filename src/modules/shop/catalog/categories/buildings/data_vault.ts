import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class DataVault extends BaseItem {
  id = 'building_data_vault';
  name = 'Secured Data Vault';
  description = 'Hardened archive of pre-collapse technology and schematics. Boosts research capabilities.';
  basePrice = 21000;
  rarity: Rarity = 'epic';
  category = 'buildings';
  emoji = '💾';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 1
    },
    perks: {
      researchBonus: 0.30,
      schematicUnlock: true,
      passiveIncome: { 
        resource: 'TECH_POINTS',
        amount: 50, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} acquired a Data Vault. Ancient technology awaits...`, 'SHOP' as any);
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
        emoji: '💾'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Data Vault',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#16A085',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new DataVault();
