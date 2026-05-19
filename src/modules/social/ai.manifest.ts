import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { SocialService } from './services/SocialService';
import { prisma } from '../../database/client';

export const SocialManifest: AiModuleManifest = {
  moduleName: 'Social',
  actions: [
    {
      action: 'check_relationship',
      description: 'Checks the friendship, marriage, or rivalry status between the speaking citizen and another user.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The ID of the other user to check the relationship with.', required: true }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const user1 = interaction.user.id;
        const user2 = params.userId;
        
        const friendship = await SocialService.getFriendship(tenantId, guildId, user1, user2);
        const marriage = await prisma.social_marriages.findFirst({
           where: { 
             tenantId, guildId, 
             OR: [
               { user1Id: user1, user2Id: user2 },
               { user1Id: user2, user2Id: user1 }
             ]
           }
        });
        
        let status = 'No specific social bond detected between these citizens.';
        if (marriage && marriage.status === 'married') status = 'These two citizens are **Married**! 💍';
        else if (friendship && friendship.status === 'accepted') status = 'These two citizens are **Friends**. 🤝';
        else if (friendship && friendship.status === 'rivals') status = 'These two citizens are **Rivals**! ⚔️';
        
        return { executed: true, result: status };
      }
    },
    {
      action: 'get_family',
      description: 'Looks up the family a citizen belongs to. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user ID to look up (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction } = context;
        const targetId = params.userId || interaction.user.id;
        const family = await SocialService.getFamilyByMember(targetId);
        
        if (!family) return { executed: true, result: `<@${targetId}> is not part of any family.` };
        
        const memberCount = (family as any).members?.length || 0;
        return {
          executed: true,
          result: `<@${targetId}> belongs to the **${(family as any).name}** family (${memberCount} member${memberCount !== 1 ? 's' : ''}).`
        };
      }
    },
    {
      action: 'get_marriage',
      description: 'Shows the marriage status and partner of a citizen. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user ID to look up (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        
        const marriage = await prisma.social_marriages.findFirst({
          where: {
            tenantId, guildId, status: 'married',
            OR: [{ user1Id: targetId }, { user2Id: targetId }]
          }
        });
        
        if (!marriage) return { executed: true, result: `<@${targetId}> is not currently married.` };
        
        const partnerId = marriage.user1Id === targetId ? marriage.user2Id : marriage.user1Id;
        return {
          executed: true,
          result: `<@${targetId}> is married to <@${partnerId}>. 💍`
        };
      }
    }
  ]
};
