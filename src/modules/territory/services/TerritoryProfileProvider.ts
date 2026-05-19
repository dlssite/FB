import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { prisma } from '../../../database/client';
import { InventoryService } from '../../shop/services/InventoryService';
import { shopRegistry } from '../../shop/catalog/engine/Registry';

export class TerritoryProfileProvider implements ProfileProvider {
  moduleName = 'territory';
  priority = 70; // Appears after social

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [];

    await shopRegistry.loadCatalog();

    const [latestTravel, buildings, allItems] = await Promise.all([
      prisma.transport_user_travel.findFirst({
        where: {
          tenantId,
          guildId,
          userId,
          OR: [{ status: 'arrived' }, { status: 'completed' }]
        },
        orderBy: { arrivalTime: 'desc' }
      }),
      prisma.territory_buildings.findMany({
        where: { tenantId, guildId, ownerId: userId }
      }),
      InventoryService.getHydratedCategoryItems(tenantId, guildId, userId)
    ]);

    let locationStr = '*Wandering / Capital*';
    if (latestTravel && latestTravel.toNationId) {
      const nation = await prisma.transport_nations.findUnique({
        where: { id: latestTravel.toNationId }
      });
      if (nation) locationStr = `**${nation.name}**`;
    }

    const buildingCounts: Record<string, number> = {};
    for (const b of buildings) {
      const itemDef = shopRegistry.getItem(b.buildingId);
      const name = itemDef?.name || b.buildingId;
      buildingCounts[name] = (buildingCounts[name] || 0) + 1;
    }

    const buildingSummary = Object.entries(buildingCounts)
      .map(([name, count]) => `• ${name}: \`${count}\``)
      .join('\n') || '*None*';

    const vehicles = allItems.filter(item => item.metadata?.isVehicle === true);
    const vehicleSummary = vehicles.map(v => `• \`${v.name}\` (${v.condition || 100}%)`).join('\n') || '*None*';

    return [
      {
        name: '🌍 Geographic & Colonial Status',
        value: `**Current Location:** ${locationStr}\n\n**Owned Infrastructure:**\n${buildingSummary}\n\n**Owned Transports/Vehicles:**\n${vehicleSummary}`,
        inline: false
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    await shopRegistry.loadCatalog();

    const [latestTravel, buildings, allItems] = await Promise.all([
      prisma.transport_user_travel.findFirst({
        where: {
          tenantId,
          guildId,
          userId,
          OR: [{ status: 'arrived' }, { status: 'completed' }]
        },
        orderBy: { arrivalTime: 'desc' }
      }),
      prisma.territory_buildings.findMany({
        where: { tenantId, guildId, ownerId: userId }
      }),
      InventoryService.getHydratedCategoryItems(tenantId, guildId, userId)
    ]);

    let currentLocation = null;
    if (latestTravel && latestTravel.toNationId) {
      const nation = await prisma.transport_nations.findUnique({
        where: { id: latestTravel.toNationId }
      });
      if (nation) currentLocation = nation.name;
    }

    const buildingCounts: Record<string, number> = {};
    for (const b of buildings) {
      const itemDef = shopRegistry.getItem(b.buildingId);
      const name = itemDef?.name || b.buildingId;
      buildingCounts[name] = (buildingCounts[name] || 0) + 1;
    }

    const vehicles = allItems.filter(item => item.metadata?.isVehicle === true);

    return {
      currentLocation,
      buildings: buildingCounts,
      totalBuildings: buildings.length,
      vehicles: vehicles.map(v => ({ name: v.name, condition: v.condition }))
    };
  }
}
