import { Interaction, MessageFlags } from 'discord.js';
import { TransportationService } from '../services/TransportationService';
import { TransportationRepository } from '../database/TransportationRepository';
import { ContainerService, replyV2 } from '../../../utils/container';
import { prisma } from '../../../database/client';
import { ShopService } from '../../shop/services/ShopService';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';
import { TerritoryRepository } from '../../territory/database/TerritoryRepository';
import { GuildMember } from 'discord.js';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');
    
    // Gatekeeper Check: Is Transport (Economy) enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'economy');
    if (!isEnabled) return;
    
    const customId = (interaction as any).customId;
    if (!customId) return;

    // --- PORTAL JUMP ---
    if (customId.startsWith('transport_portal_')) {
      try { await (interaction as any).deferReply({ flags: MessageFlags.Ephemeral }); } catch (e) { return; }
      const nationId = parseInt(customId.replace('transport_portal_', ''), 10);
      
      try {
        await TransportationService.handlePortalUse(interaction, nationId);
      } catch (err: any) {
        await replyV2(interaction, ContainerService.simple(`❌ Spatial distortion detected: ${err.message}`), true);
      }
      return;
    }

    // --- TRAVEL CONSOLE: NATION SELECT ---
    if (interaction.isStringSelectMenu() && customId.startsWith('trans_nav_nation')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const nationId = parseInt(interaction.values[0], 10);
      
      const parts = customId.split('_');
      const vehicleId = parts[3] !== 'none' ? parts[3] : undefined;

      return TransportationService.renderTravelConsole(interaction, tenantId, guildId, interaction.user.id, nationId, vehicleId);
    }

    // --- TRAVEL CONSOLE: VEHICLE SELECT ---
    if (interaction.isStringSelectMenu() && customId.startsWith('trans_nav_vehicle')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const vehicleId = interaction.values[0];
      
      const parts = customId.split('_');
      const nationId = parts[3] !== 'none' ? parseInt(parts[3], 10) : undefined;

      return TransportationService.renderTravelConsole(interaction, tenantId, guildId, interaction.user.id, nationId, vehicleId);
    }

    // --- TRAVEL CONSOLE: IGNITE ---
    if (interaction.isButton() && customId.startsWith('trans_nav_start_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const parts = customId.split('_');
      const nationId = parseInt(parts[3], 10);
      const vehicleId = parts[4];

      try {
        const arrivalTime = await TransportationService.startTravel(tenantId, guildId, interaction.member as GuildMember, nationId, vehicleId);
        const nation = await TerritoryRepository.listByGuild(tenantId, guildId).then(list => list.find(n => n.id === nationId));

        return await replyV2(interaction, ContainerService.create({
          title: '🚀 Departure Confirmed',
          description: `You have departed for **${nation?.name || 'Destination'}**.\n\n**ETA:** <t:${Math.floor(arrivalTime.getTime() / 1000)}:R>`,
          color: '#FF9F43',
          interaction,
          footer: true
        }));
      } catch (err: any) {
        return await replyV2(interaction, ContainerService.simple(`❌ Flight Systems Failure: ${err.message}`), true);
      }
    }

    // --- TERRITORY ANALYTICS: SELECT NATION ---
    if (interaction.isStringSelectMenu() && customId === 'trans_stats_select') {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const nationId = parseInt(interaction.values[0], 10);

      const nation = await TerritoryRepository.listByGuild(tenantId, guildId).then(list => list.find(n => n.id === nationId));
      if (!nation) return await replyV2(interaction, ContainerService.simple('❌ Nation not found.'));

      // 1. Population Census
      const guild = interaction.guild;
      const role = guild?.roles.cache.get(nation.roleId);
      const population = role?.members.size || 0;

      // 2. Transit Metrics
      const incoming = await TransportationRepository.getPendingArrivals().then(list => 
        list.filter(t => t.toNationId === nationId && t.guildId === guildId).length
      );

      // 3. Infrastructure Summary
      const { TerritoryBuildingService } = await import('../../territory/services/TerritoryBuildingService');
      const infraSummary = await TerritoryBuildingService.getNationInfrastructureSummary(tenantId, guildId, nationId);
      const totalBuildings = Object.values(infraSummary).reduce((a, b) => a + b, 0);

      // 4. Prominent Colonists
      const leaders = await TerritoryBuildingService.getProminentColonists(tenantId, guildId, nationId);
      const leaderboard = leaders.length 
        ? leaders.map((l, i) => `${i + 1}. <@${l.userId}> (**${l.count}** units)`).join('\n')
        : 'No infrastructure recorded.';

      const fields = [
        { name: '👥 Population', value: `**${population}** Residents`, inline: true },
        { name: '🛬 Transit Radar', value: `**${incoming}** Inbound`, inline: true },
        { name: '🏗️ Infrastructure', value: `**${totalBuildings}** Units Deployed`, inline: true },
        { name: '💎 Regional Resource', value: `**${nation.resourceName || 'Unknown'}**`, inline: true },
        { name: '👑 Top Colonists', value: leaderboard, inline: false }
      ];

      return await replyV2(interaction, ContainerService.create({
        title: `📊 Census: ${nation.name}`,
        description: `Deep intelligence report for the **${nation.name}** territory.`,
        fields,
        color: '#7367F0',
        interaction,
        footer: true
      }));
    }
  }
};
