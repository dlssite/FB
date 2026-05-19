import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { FactionRepository } from '../database/FactionRepository';
import { prisma } from '../../../database/client';

export class FactionProfileProvider implements ProfileProvider {
  moduleName = 'faction';
  priority = 40; // Appears after streaks

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [
      {
        name: '🛡️ Faction Allegiance',
        value: '**Faction:** *Unaffiliated*\n**Motto:** *N/A*\n**Rank:** *N/A*',
        inline: true
      }
    ];

    const faction = await FactionRepository.getUserFaction(tenantId, guildId, userId);
    if (!faction) return [
      {
        name: '🛡️ Faction Allegiance',
        value: '**Faction:** *Unaffiliated*\n**Motto:** *N/A*\n**Rank:** *N/A*',
        inline: true
      }
    ];

    const member = await prisma.faction_members.findFirst({
      where: { tenantId, guildId, userId }
    });

    return [
      {
        name: '🛡️ Faction Allegiance',
        value: `**Faction:** \`${faction.name}\`\n**Motto:** *"${faction.motto || 'No motto'}"*\n**Rank:** \`${member?.rank || 'member'}\``,
        inline: true
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const faction = await FactionRepository.getUserFaction(tenantId, guildId, userId);
    if (!faction) return { memberOf: null };

    const member = await prisma.faction_members.findFirst({
      where: { tenantId, guildId, userId }
    });

    return {
      memberOf: faction.name,
      motto: faction.motto,
      rank: member?.rank || 'member',
      isLeader: faction.masterId === userId
    };
  }
}
