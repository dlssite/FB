import { FactionRepository } from '../database/FactionRepository';
import { Logger } from '../../../utils/logger';

export class FactionService {
  static async setupFaction(tenantId: string, guild: any, masterMember: any, name: string, motto: string, leaderRoleName: string, memberRoleName: string): Promise<any> {
    
    // 1. Check if name is taken
    const existing = await FactionRepository.getFactionByName(tenantId, guild.id, name);
    if (existing) {
        throw new Error('A Faction with this name already exists in this territory.');
    }

    // 2. Check if user is already in a faction
    const userFaction = await FactionRepository.getUserFaction(tenantId, guild.id, masterMember.user.id);
    if (userFaction) {
        throw new Error('You are already bound to a Faction. You must leave it before founding a new one.');
    }

    // 3. Create Discord Roles
    let memberRole;
    let leaderRole;
    try {
        memberRole = await guild.roles.create({
            name: `${name} - ${memberRoleName}`,
            color: 'Default',
            reason: `Created Faction: ${name}`
        });

        leaderRole = await guild.roles.create({
            name: `${name} - ${leaderRoleName}`,
            color: 'Gold',
            reason: `Created Faction Leader Role: ${name}`
        });
    } catch (err) {
        Logger.error('Failed to create Discord roles for Faction', err);
        throw new Error('Failed to create Faction roles. Please ensure the bot has Manage Roles permission.');
    }

    // 3.5. Position Roles according to Server Settings (Header / Footer)
    await FactionService.positionFactionRoles(tenantId, guild, memberRole, leaderRole);

    // 4. Save to Database
    const faction = await FactionRepository.createFaction(
        tenantId,
        guild.id,
        name,
        motto,
        masterMember.user.id,
        leaderRoleName,
        memberRoleName,
        memberRole.id,
        leaderRole.id
    );

    // 5. Assign Roles to the Founder
    try {
        await masterMember.roles.add([memberRole.id, leaderRole.id]);
    } catch (err) {
        Logger.warn('Could not assign faction roles to the founder. They might be ranked higher than the bot.');
    }

    return faction;
  }

  static async deployBuilding(tenantId: string, guildId: string, userId: string, inventoryInstance: any, buildingItem: any): Promise<void> {
      // 1. Fetch User's Faction
      const { FactionRepository } = await import('../database/FactionRepository');
      const { prisma } = await import('../../../database/client');

      const faction = await FactionRepository.getUserFaction(tenantId, guildId, userId);
      
      if (!faction) {
          throw new Error('You must be in a Faction to deploy an HQ Building.');
      }

      if (faction.masterId !== userId) {
          throw new Error('Only the Faction Leader can deploy buildings to the Headquarters.');
      }

      if (!faction.hqTerritoryId) {
          throw new Error('Your Faction does not have a Headquarters. Claim one first using `/faction hq claim`.');
      }

      // 2. Consume Item
      await prisma.$transaction(async (tx) => {
          if (inventoryInstance.quantity > 1) {
              await tx.inventory_adventures.update({
                  where: { id: inventoryInstance.id },
                  data: { quantity: inventoryInstance.quantity - 1 }
              });
          } else {
              await tx.inventory_adventures.delete({
                  where: { id: inventoryInstance.id }
              });
          }

          // 3. Deploy Building
          await tx.territory_buildings.create({
              data: {
                  tenantId,
                  guildId,
                  nationId: faction.hqTerritoryId as number,
                  ownerId: userId, // Faction Leader's ID
                  buildingId: buildingItem.id,
                  condition: 100,
                  metadata: { factionId: faction.id, buildingName: buildingItem.name }
              }
          });
      });
  }

  static async positionFactionRoles(tenantId: string, guild: any, memberRole: any, leaderRole: any): Promise<void> {
    try {
        const { prisma } = await import('../../../database/client');
        const settings = await prisma.guild_settings.findUnique({
            where: { guildId_tenantId: { guildId: guild.id, tenantId } }
        });

        if (settings) {
            if (settings.factionHeaderRoleId) {
                const headerRole = await guild.roles.fetch(settings.factionHeaderRoleId).catch(() => null);
                if (headerRole) {
                    // Set memberRole first, then leaderRole to headerRole.position - 1.
                    // This pushes memberRole down, placing leaderRole above memberRole.
                    await memberRole.setPosition(headerRole.position - 1).catch(() => {});
                    await leaderRole.setPosition(headerRole.position - 1).catch(() => {});
                }
            } else if (settings.factionFooterRoleId) {
                const footerRole = await guild.roles.fetch(settings.factionFooterRoleId).catch(() => null);
                if (footerRole) {
                    // Set leaderRole first, then memberRole to footerRole.position + 1.
                    // This pushes leaderRole up, placing leaderRole above memberRole.
                    await leaderRole.setPosition(footerRole.position + 1).catch(() => {});
                    await memberRole.setPosition(footerRole.position + 1).catch(() => {});
                }
            }
        }
    } catch (err) {
        Logger.warn(`Failed to adjust Faction role hierarchy positions: ${err}`);
    }
  }
}
