import { prisma } from '../../../database/client';

export class FactionRepository {
  static async createFaction(tenantId: string, guildId: string, name: string, motto: string, masterId: string, leaderRoleName: string, memberRoleName: string, discordRoleId: string, discordLeaderId: string) {
    return await prisma.$transaction(async (tx) => {
      // Create the faction
      const faction = await tx.factions.create({
        data: {
          tenantId,
          guildId,
          name,
          motto,
          masterId,
          leaderRoleName,
          memberRoleName,
          discordRoleId,
          discordLeaderId,
          bankBalance: 0,
        }
      });

      // Add the master as the first member
      await tx.faction_members.create({
        data: {
          tenantId,
          guildId,
          factionId: faction.id,
          userId: masterId,
          rank: 'master'
        }
      });

      return faction;
    });
  }

  static async getFactionByName(tenantId: string, guildId: string, name: string) {
    return await prisma.factions.findUnique({
      where: {
        guildId_name_tenantId: { guildId, name, tenantId }
      }
    });
  }

  static async getUserFaction(tenantId: string, guildId: string, userId: string) {
    const member = await prisma.faction_members.findFirst({
      where: { tenantId, guildId, userId }
    });
    if (!member) return null;
    
    return await prisma.factions.findUnique({
      where: { id: member.factionId }
    });
  }
}
