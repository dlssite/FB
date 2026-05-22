import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';
import { Logger } from '../../../../../utils/logger';

class CrystalGarden extends BaseItem {
  id = 'building_crystal_garden';
  name = 'Synth-Crystal Garden';
  description = 'Cultivates rare synthetic crystals used in advanced technology and magical artifacts.';
  basePrice = 16500;
  rarity: Rarity = 'rare';
  category = 'buildings';
  emoji = '💎';

  metadata = {
    isBuilding: true,
    capacity: {
      vehicles: 0,
      members: 2
    },
    perks: {
      crystalProduction: true,
      craftingBonus: 0.20,
      passiveIncome: { 
        resource: 'SYNTH_CRYSTALS',
        amount: 40, 
        interval: 'hourly' 
      }
    }
  };

  async onPurchase(userId: string, guildId: string, instance: any): Promise<void> {
    Logger.info(`[TERRITORY_INTEGRATION] User ${userId} planted a Synth-Crystal Garden for resource generation.`, 'SHOP' as any);
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
        emoji: '💎'
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Synth-Crystal Garden',
      description: 'Select the Nation where you wish to deploy this structure. **Warning: This will consume the item.**',
      color: '#E91E63',
      components: [row],
      interaction,
      footer: true
    }));
  }
}

export default new CrystalGarden();
