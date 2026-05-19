import { SlashCommandBuilder } from 'discord.js';
import { TransportationService } from '../services/TransportationService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  data: new SlashCommandBuilder()
    .setName('visit')
    .setDescription('🚀 Open the Inter-Nation Travel Console or fast-travel.')
    .addStringOption(opt => opt.setName('nation').setDescription('Fast-travel to a specific nation').setRequired(false)),

  async execute(interaction: any) {
    const { guild, member } = interaction;
    const guildId = guild.id;

    // Resolve tenant for economy/transport
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');
    const targetNationInput = interaction.options?.getString('nation');

    if (targetNationInput) {
      const { TerritoryRepository } = await import('../../territory/database/TerritoryRepository');
      const { InventoryService } = await import('../../shop/services/InventoryService');
      const { ContainerService, replyV2 } = await import('../../../utils/container');

      const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
      const targetNation = nations.find(n => n.name.toLowerCase() === targetNationInput.toLowerCase());

      if (!targetNation) {
        return await replyV2(interaction, ContainerService.simple(`❌ Nation **${targetNationInput}** not found.`));
      }

      if (member.roles.cache.has(targetNation.roleId)) {
        return await replyV2(interaction, ContainerService.simple(`❌ You are already in **${targetNation.name}**.`));
      }

      const allItems = await InventoryService.getHydratedCategoryItems(tenantId, guildId, member.id);
      const vehicles = allItems.filter(item => item.metadata?.isVehicle === true && item.condition > 0);

      if (!vehicles.length) {
        return await replyV2(interaction, ContainerService.simple(`❌ Fast-Travel failed: No active vehicles found in your inventory.`));
      }

      // Find fastest vehicle
      const bestVehicle = vehicles.sort((a, b) => (a.metadata?.travelTime || 60) - (b.metadata?.travelTime || 60))[0];

      try {
        const arrivalTime = await TransportationService.startTravel(tenantId, guildId, member, targetNation.id, bestVehicle.instanceId);
        return await replyV2(interaction, ContainerService.create({
          title: '🚀 Fast-Travel Departure',
          description: `You bypassed the console and departed for **${targetNation.name}** via your **${bestVehicle.name}**.\n\n**ETA:** <t:${Math.floor(arrivalTime.getTime() / 1000)}:R>`,
          color: '#FF9F43',
          interaction,
          footer: true
        }));
      } catch (err: any) {
        return await replyV2(interaction, ContainerService.simple(`❌ Flight Systems Failure: ${err.message}`));
      }
    }

    // Fallback: Open interactive console
    return await TransportationService.renderTravelConsole(interaction, tenantId, guildId, member.id);
  }
};
