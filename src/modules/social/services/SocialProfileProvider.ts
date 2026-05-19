import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { prisma } from '../../../database/client';

export class SocialProfileProvider implements ProfileProvider {
  moduleName = 'social';
  priority = 60; // Appears after birthday

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [];

    const [friendsCount, marriage, familyMember] = await Promise.all([
      prisma.social_friends.count({
        where: {
          tenantId,
          guildId,
          status: 'accepted',
          OR: [{ user1Id: userId }, { user2Id: userId }]
        }
      }),
      prisma.social_marriages.findFirst({
        where: {
          tenantId,
          guildId,
          status: 'married',
          OR: [{ user1Id: userId }, { user2Id: userId }]
        }
      }),
      prisma.social_family_members.findFirst({
        where: { userId },
        include: { family: true }
      })
    ]);

    let marriageStr = '*Single*';
    if (marriage) {
      const partnerId = marriage.user1Id === userId ? marriage.user2Id : marriage.user1Id;
      marriageStr = `<@${partnerId}> (Resonance: \`${marriage.resonanceScore}💕\`)`;
    }

    let familyStr = '*None*';
    if (familyMember && familyMember.family) {
      familyStr = `**${familyMember.family.name}** (\`${familyMember.role}\`)`;
    }

    return [
      {
        name: '💝 Social Resonance',
        value: `**Partner:** ${marriageStr}\n**Comrades:** \`${friendsCount} friends\`\n**Lineage:** ${familyStr}`,
        inline: true
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const [friendsCount, marriage, familyMember] = await Promise.all([
      prisma.social_friends.count({
        where: {
          tenantId,
          guildId,
          status: 'accepted',
          OR: [{ user1Id: userId }, { user2Id: userId }]
        }
      }),
      prisma.social_marriages.findFirst({
        where: {
          tenantId,
          guildId,
          status: 'married',
          OR: [{ user1Id: userId }, { user2Id: userId }]
        }
      }),
      prisma.social_family_members.findFirst({
        where: { userId },
        include: { family: true }
      })
    ]);

    return {
      friendsCount,
      isMarried: !!marriage,
      partnerId: marriage ? (marriage.user1Id === userId ? marriage.user2Id : marriage.user1Id) : null,
      resonanceScore: marriage?.resonanceScore || 0,
      family: familyMember?.family ? {
        name: familyMember.family.name,
        role: familyMember.role
      } : null
    };
  }
}
