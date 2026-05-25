import { prisma } from '../../../database/client';
import { TerritoryRepository } from '../../territory/database/TerritoryRepository';

/**
 * NationContextProvider enriches AI context with nation and patron information
 * Allows the AI to understand which users are patrons of which nations
 */
export class NationContextProvider {
  /**
   * Generates AI context about all nations and their patrons for a specific guild
   */
  static async generateNationContext(tenantId: string, guildId: string, guild: any): Promise<string> {
    try {
      const nations = await TerritoryRepository.listByGuild(tenantId, guildId);

      if (nations.length === 0) {
        return 'No territories/nations are currently established in this realm.';
      }

      const nationContexts = await Promise.all(
        nations.map(async (nation) => {
          const patrons = await TerritoryRepository.getNationPatrons(guildId, nation.id, guild);

          const patronsList =
            patrons.length > 0
              ? patrons.map((p) => `${p.username} (@${p.tag})`).join(', ')
              : 'No patrons assigned';

          return `
**${nation.name}**
- Rulers/Patrons: ${patronsList}
- Resource: ${nation.resourceName || 'Unknown'}
- Base Price: ${nation.resourceBasePrice || 'N/A'}
- Description: ${nation.description || 'No description provided'}`;
        })
      );

      return `
## Nation & Patron Overview

The following territories are established in this realm, each with their own rulers and patrons:

${nationContexts.join('\n')}

When asked about who rules a nation or who the patrons are, refer to this information.`;
    } catch (error) {
      return 'Unable to retrieve nation information at this time.';
    }
  }

  /**
   * Gets patron information for a specific nation
   */
  static async getNationPatronInfo(guildId: string, nationId: number, guild: any): Promise<string> {
    try {
      const nation = await prisma.transport_nations.findUnique({
        where: { id: nationId },
      });

      if (!nation) {
        return 'Nation not found.';
      }

      const patrons = await TerritoryRepository.getNationPatrons(guildId, nationId, guild);

      if (patrons.length === 0) {
        return `**${nation.name}** has no patrons/rulers currently assigned.`;
      }

      const patronList = patrons.map((p) => `• **${p.username}** (${p.tag})`).join('\n');

      return `**${nation.name}** is ruled/patroned by:\n${patronList}`;
    } catch (error) {
      return 'Unable to retrieve patron information.';
    }
  }

  /**
   * Gets all nations where a specific user is a patron
   */
  static async getUserNations(guildId: string, userId: string, guild: any): Promise<string> {
    try {
      const nations = await prisma.transport_nations.findMany({
        where: { guildId },
      });

      const userNations = [];

      for (const nation of nations) {
        const patrons = await TerritoryRepository.getNationPatrons(guildId, nation.id, guild);
        if (patrons.some((p) => p.id === userId)) {
          userNations.push(nation.name);
        }
      }

      if (userNations.length === 0) {
        return `This user is not a patron/ruler of any nations.`;
      }

      return `This user is a patron/ruler of: ${userNations.join(', ')}`;
    } catch (error) {
      return 'Unable to retrieve user nation information.';
    }
  }

  /**
   * Creates a formatted string for AI system prompt that includes all nation/patron context
   * This should be injected into AI system prompts to provide context awareness
   */
  static async createSystemPromptContext(tenantId: string, guildId: string, guild: any): Promise<string> {
    const nationContext = await this.generateNationContext(tenantId, guildId, guild);

    return `
## NATION & GOVERNANCE KNOWLEDGE

You have access to information about the established nations/territories and their rulers.

${nationContext}

### Guidelines:
- When asked about rulers, patrons, or governors of a nation, reference this information
- If someone asks "who rules X nation?", tell them the patron names
- You understand that each nation can have multiple patrons sharing the same role
- Provide this context naturally in conversation without being asked directly`;
  }
}
