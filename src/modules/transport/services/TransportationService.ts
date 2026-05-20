import { GuildMember, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { TransportationRepository } from '../database/TransportationRepository';
import { TerritoryRepository } from '../../territory/database/TerritoryRepository';
import { TerritoryPowerService } from '../../territory/services/TerritoryPowerService';
import { EmbedService } from '../../../utils/embed';
import { ContainerService, replyV2 } from '../../../utils/container';
import { InventoryService } from '../../shop/services/InventoryService';

export class TransportationService {
  /**
   * INITIATE TIMED TRAVEL (VEHICLE)
   */
  static async startTravel(tenantId: string, guildId: string, member: GuildMember, destinationId: number, vehicleInstanceId: string) {
    const vehicle = await InventoryService.getHydratedInstance(vehicleInstanceId);
    if (!vehicle || vehicle.condition <= 0) throw new Error('Vehicle is unavailable or broken.');

    // Extract travel time from the hydrated metadata
    const travelTime = vehicle.metadata.travelTime || 60; // Default fallback 60s
    const arrivalTime = new Date(Date.now() + travelTime * 1000);

    // 0. Prevent Multiple Concurrent Travels
    const activeTravel = await TransportationRepository.getActiveTravel(tenantId, guildId, member.id);
    if (activeTravel) {
      throw new Error('You are already traveling! Please wait until you arrive at your destination.');
    }

    // 1. Record Travel
    await TransportationRepository.createTravel(tenantId, guildId, {
      userId: member.id,
      toNationId: destinationId,
      vehicleInstanceId, 
      arrivalTime
    });

    // 2. Degrade Vehicle
    await InventoryService.degradeItemCondition(vehicleInstanceId, 10);

    // 3. Remove current nation roles immediately (User is in transit)
    const allNations = await TerritoryRepository.listByGuild(tenantId, guildId);
    for (const nation of allNations) {
      if (member.roles.cache.has(nation.roleId)) {
        await member.roles.remove(nation.roleId, '[Transportation] Departed on journey').catch(() => {});
      }
    }

    return arrivalTime;
  }

  /**
   * PROCESS PENDING ARRIVALS (BACKGROUND)
   */
  static async processArrivals(client: any) {
    const pending = await TransportationRepository.getPendingArrivals();
    
    for (const travel of pending) {
      try {
        const guild = client.guilds.cache.get(travel.guildId);
        if (!guild) continue;

        const member = await guild.members.fetch(travel.userId).catch(() => null);
        if (!member) {
          await TransportationRepository.updateTravelStatus(travel.id, 'cancelled');
          continue;
        }

        const nation = await TerritoryRepository.listByGuild(travel.tenantId, travel.guildId)
          .then(list => list.find(n => n.id === travel.toNationId));
        
        if (!nation) {
          await TransportationRepository.updateTravelStatus(travel.id, 'cancelled');
          continue;
        }

        // Add Role
        await member.roles.add(nation.roleId, '[Transportation] Arrived at destination').catch(() => {});
        
        // Update DB
        await TransportationRepository.updateTravelStatus(travel.id, 'arrived');

        // Notify
        let means = 'Portal/Other';
        if (travel.vehicleInstanceId) {
          const vehicle = await InventoryService.getHydratedInstance(travel.vehicleInstanceId);
          if (vehicle) means = vehicle.name;
        }

        await TerritoryPowerService.logAndNotify(
          travel.tenantId,
          member, // Acting as self for the notify part
          member,
          nation,
          'ARRIVAL',
          `Arrived via ${means}`,
          null
        ).catch(() => {});

        // Public Arrival Announcement
        if (nation.arrivalChannelId) {
          const arrivalChannel = guild.channels.cache.get(nation.arrivalChannelId) as TextChannel;
          if (arrivalChannel) {
            await arrivalChannel.send({
              content: `<@&${nation.roleId}>`,
              embeds: [
                EmbedService.success(`🛬 **New Arrival: ${member.displayName}**`)
                  .setDescription(`**<@${member.id}>** has safely arrived in **${nation.name}** via **${means}**.\n\nPlease give them a warm welcome!`)
                  .toJSON()
              ]
            }).catch(() => {});
          }
        }

        try {
          await member.send({
            embeds: [EmbedService.success(`🏰 **Welcome to ${nation.name}!**\nYou have arrived safely after your journey.`).toJSON()]
          });
        } catch {}

      } catch (err) {
        console.error(`[TransportationService] Arrival error for ${travel.userId}:`, err);
      }
    }
  }

  /**
   * PORTAL INTERACTION (INSTANT)
   */
  static async handlePortalUse(interaction: any, nationId: number) {
    const { guild, member, message } = interaction;
    const guildId = guild.id;
    
    // Find portal record
    const portal = await TransportationRepository.getPortalByMessage(guildId, message.id, nationId);
    if (!portal || portal.status !== 'open') {
      return interaction.editReply(ContainerService.simple('❌ This portal rift has collapsed.'));
    }

    if ((portal.currentUses ?? 0) >= (portal.maxUses ?? 10)) {
      return interaction.editReply(ContainerService.simple('❌ This portal has run out of energy.'));
    }

    const nation = await TerritoryRepository.listByGuild(portal.tenantId, guildId)
      .then(list => list.find(n => n.id === nationId));
    
    if (!nation) return interaction.editReply(ContainerService.simple('❌ Destination nation no longer exists.'));

    // Permission check for travel ban
    if (nation.banRoleId && member.roles.cache.has(nation.banRoleId)) {
      return interaction.editReply(ContainerService.simple(`🚫 You are banned from **${nation.name}**.`));
    }

    // TELEPORT
    const allNations = await TerritoryRepository.listByGuild(portal.tenantId, guildId);
    for (const n of allNations) {
      if (member.roles.cache.has(n.roleId)) {
        await member.roles.remove(n.roleId, '[Transportation] Portal jump').catch(() => {});
      }
    }
    await member.roles.add(nation.roleId, '[Transportation] Portal jump').catch(() => {});

    // Increment Uses
    await TransportationRepository.incrementPortalUses(portal.id);

    // UPDATE PORTAL UI (Stability Feedback)
    await this.updatePortalEmbed(interaction, portal.messageId!);

    // Notify
    await TerritoryPowerService.logAndNotify(
      portal.tenantId,
      member,
      member,
      nation,
      'PORTAL_USE',
      'Traveled via Spatial Rift',
      null
    ).catch(() => {});

    return interaction.editReply(ContainerService.simple(`✅ Dimensional Rift stabilized! Welcome to **${nation.name}**.`));
  }

  /**
   * RENDER INTERACTIVE TRAVEL CONSOLE
   */
  static async renderTravelConsole(interaction: any, tenantId: string, guildId: string, userId: string, selectedNationId?: number, selectedVehicleId?: string) {
    const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
    const allItems = await InventoryService.getHydratedCategoryItems(tenantId, guildId, userId);
    const vehicles = allItems.filter(item => item.metadata?.isVehicle === true);

    if (!vehicles.length) {
      return await replyV2(interaction, ContainerService.create({
        title: '🚀 Transportation Hub',
        description: '❌ No active vehicles detected in your garage. You must acquire a vehicle from the marketplace before traveling between nations.',
        color: '#E74C3C',
        footer: true,
        interaction
      }));
    }

    const rows: ActionRowBuilder<any>[] = [];

    // 1. Nation Selector
    const nationSelect = new StringSelectMenuBuilder()
      .setCustomId(`trans_nav_nation_${selectedVehicleId || 'none'}`)
      .setPlaceholder('📍 Select Destination Nation...')
      .addOptions(nations.map(n => ({
        label: n.name,
        value: n.id.toString(),
        emoji: '📍',
        default: n.id === selectedNationId
      })));
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(nationSelect));

    // 2. Vehicle Selector
    const vehicleSelect = new StringSelectMenuBuilder()
      .setCustomId(`trans_nav_vehicle_${selectedNationId || 'none'}`)
      .setPlaceholder('🚗 Choose Your Vehicle...')
      .addOptions(vehicles.map(v => ({
        label: v.name,
        description: `Condition: ${v.condition}% • ETA Mod: ${v.metadata.travelTime || 60}s`,
        value: v.instanceId,
        emoji: '🚗',
        default: v.instanceId === selectedVehicleId
      })));
    rows.push(new ActionRowBuilder<any>().addComponents(vehicleSelect));

    // 3. Pre-flight Checks
    const nation = selectedNationId ? nations.find(n => n.id === selectedNationId) : null;
    const vehicle = selectedVehicleId ? vehicles.find(v => v.instanceId === selectedVehicleId) : null;
    const member = interaction.member as GuildMember;
    const alreadyInNation = nation && member?.roles?.cache?.has(nation.roleId);

    // 4. Action Button
    const canIgnite = selectedNationId && selectedVehicleId && !alreadyInNation;
    const igniteBtn = new ButtonBuilder()
      .setCustomId(`trans_nav_start_${selectedNationId}_${selectedVehicleId}`)
      .setLabel(alreadyInNation ? 'Already at Destination' : 'Ignite Engines & Depart')
      .setStyle(alreadyInNation ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(!canIgnite);
    rows.push(new ActionRowBuilder<any>().addComponents(igniteBtn));

    // 5. Detailed View

    return await replyV2(interaction, ContainerService.create({
      title: '🚀 Inter-Nation Travel Console',
      description: 'Configure your journey parameters below to transition between registered territories.',
      color: '#7367F0',
      fields: [
        { name: '📍 Destination', value: nation ? `**${nation.name}**` : '_Not selected_', inline: true },
        { name: '🚗 Vehicle', value: vehicle ? `**${vehicle.name}** (${vehicle.condition}%)` : '_Not selected_', inline: true },
        { name: '⏳ Estimated Travel', value: vehicle ? `**${vehicle.metadata.travelTime || 60}s**` : '_N/A_', inline: true },
      ],
      components: rows,
      interaction,
      footer: true
    }));
  }

  /**
   * UPDATE PORTAL EMBED (STABILITY UI)
   */
  static async updatePortalEmbed(interaction: any, messageId: string) {
    const portals = await TransportationRepository.getPortalsInMessage(messageId);
    if (!portals.length) return;

    const firstPortal = portals[0];
    const nationList = await TerritoryRepository.listByGuild(firstPortal.tenantId, firstPortal.guildId);

    const fields = portals.map(p => {
      const n = nationList.find(nl => nl.id === p.destinationNationId);
      const remaining = (p.maxUses ?? 10) - (p.currentUses ?? 0);
      const pct = (remaining / (p.maxUses ?? 10)) * 100;
      let status = 'Stable';
      if (pct < 25) status = 'CRITICAL';
      else if (pct < 50) status = 'Unstable';

      return {
        name: `📍 ${n?.name || 'Unknown'}`,
        value: `Uses: **${remaining}** / ${p.maxUses}\nStatus: \`${status}\``,
        inline: true
      };
    });

    const overallMax = portals.reduce((acc, p) => acc + (p.maxUses ?? 10), 0);
    const overallUsed = portals.reduce((acc, p) => acc + (p.currentUses ?? 0), 0);
    const overallPct = ((overallMax - overallUsed) / overallMax) * 100;
    
    const color = overallPct < 25 ? '#EA5455' : (overallPct < 50 ? '#FF9F43' : '#7367F0');

    const rows = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();
    portals.forEach((p, i) => {
      if (i > 0 && i % 5 === 0) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder<ButtonBuilder>();
      }
      const n = nationList.find(nl => nl.id === p.destinationNationId);
      const isDisabled = (p.currentUses ?? 0) >= (p.maxUses ?? 10);
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`transport_portal_${p.destinationNationId}`)
          .setLabel(`Enter ${n?.name || 'Rift'}`)
          .setStyle(isDisabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(isDisabled)
      );
    });
    rows.push(currentRow);

    const container = ContainerService.create({
      title: `🌀 ${firstPortal.title || 'Dimensional Portal'}`,
      description: firstPortal.description || 'Active spatial rifts detected.',
      fields,
      color,
      media: firstPortal.imageUrl ? [firstPortal.imageUrl] : [],
      components: rows,
      interaction
    }) as any;

    const portalMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (portalMsg && portalMsg.editable) {
      await portalMsg.edit({ embeds: container.embeds, components: container.components }).catch(() => {});
    }
  }
}
