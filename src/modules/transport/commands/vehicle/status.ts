import { ContainerService, replyV2 } from '../../../../utils/container';
import { InventoryService } from '../../../shop/services/InventoryService';
import { RoutingService } from '../../../../services/RoutingService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('status')
       .setDescription('📊 View your ship health and stats.'),

  async execute(interaction: any) {
    const { guild, member } = interaction;
    const guildId = guild.id;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const allItems = await InventoryService.getHydratedCategoryItems(tenantId, guildId, member.id);
    const vehicles = allItems.filter(item => item.metadata?.isVehicle === true);
    if (!vehicles.length) return await replyV2(interaction, ContainerService.simple('❌ You have no vehicles. Use `/shop browse` to get one.'));

    const fields = vehicles.map(v => ({
      name: v.name,
      value: `Rarity: **${v.rarity.toUpperCase()}**\nCondition: **${v.condition}%**\nSpeed: \`${Math.floor(3600 / (v.metadata.travelTime || 60))} ly/h\``,
      inline: true
    }));

    return await replyV2(interaction, ContainerService.create({
      title: '📊 Fleet Status',
      description: 'Current status of all registered vessels in your name.',
      fields,
      color: '#7367F0',
      interaction,
      footer: true
    }));
  }
};
