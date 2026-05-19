import { prisma } from '../../../database/client';
import { tenantStorage } from '../../../utils/context';
import { Logger } from '../../../utils/logger';

export class SocialService {
  // --- FRIENDSHIP LOGIC ---
  
  static async sendFriendRequest(tenantId: string, guildId: string, fromId: string, toId: string) {
    const sorted = [fromId, toId].sort();
    return await prisma.social_friends.upsert({
      where: { 
        user1Id_user2Id_guildId_tenantId: { 
          user1Id: sorted[0], 
          user2Id: sorted[1], 
          guildId, 
          tenantId 
        } 
      },
      update: { status: 'pending', updatedAt: new Date() },
      create: { 
        tenantId, 
        guildId, 
        user1Id: sorted[0], 
        user2Id: sorted[1], 
        status: 'pending' 
      }
    });
  }

  static async acceptFriendRequest(tenantId: string, guildId: string, fromId: string, toId: string) {
    const sorted = [fromId, toId].sort();
    return await prisma.social_friends.update({
      where: { 
        user1Id_user2Id_guildId_tenantId: { 
          user1Id: sorted[0], 
          user2Id: sorted[1], 
          guildId, 
          tenantId 
        } 
      },
      data: { status: 'accepted', updatedAt: new Date() }
    });
  }

  static async getFriendship(tenantId: string, guildId: string, user1Id: string, user2Id: string) {
    const sorted = [user1Id, user2Id].sort();
    return await prisma.social_friends.findUnique({
      where: { 
        user1Id_user2Id_guildId_tenantId: { 
          user1Id: sorted[0], 
          user2Id: sorted[1], 
          guildId, 
          tenantId 
        } 
      }
    });
  }

  // --- MARRIAGE LOGIC ---

  static async proposeMarriage(tenantId: string, guildId: string, fromId: string, toId: string) {
    const sorted = [fromId, toId].sort();
    return await prisma.social_marriages.upsert({
      where: { 
        user1Id_user2Id_guildId_tenantId: { 
          user1Id: sorted[0], 
          user2Id: sorted[1], 
          guildId, 
          tenantId 
        } 
      },
      update: { status: 'pending', updatedAt: new Date() },
      create: { 
        tenantId, 
        guildId, 
        user1Id: sorted[0], 
        user2Id: sorted[1], 
        status: 'pending' 
      }
    });
  }

  static async acceptMarriage(tenantId: string, guildId: string, fromId: string, toId: string) {
    const sorted = [fromId, toId].sort();
    return await prisma.social_marriages.update({
      where: { 
        user1Id_user2Id_guildId_tenantId: { 
          user1Id: sorted[0], 
          user2Id: sorted[1], 
          guildId, 
          tenantId 
        } 
      },
      data: { 
        status: 'married', 
        marriedAt: new Date(), 
        updatedAt: new Date() 
      }
    });
  }

  // --- FAMILY LOGIC ---

  static async foundFamily(tenantId: string, guildId: string, name: string, head1Id: string, head2Id?: string) {
    const family = await prisma.social_families.create({
      data: {
        tenantId,
        guildId,
        name,
        head1Id,
        head2Id
      }
    });

    await prisma.social_family_members.create({
      data: {
        familyId: family.id,
        userId: head1Id,
        role: 'head'
      }
    });

    if (head2Id) {
      await prisma.social_family_members.create({
        data: {
          familyId: family.id,
          userId: head2Id,
          role: 'head'
        }
      });
    }

    return family;
  }

  static async getFamilyByMember(userId: string) {
    const membership = await prisma.social_family_members.findFirst({
      where: { userId }
    });
    if (!membership) return null;

    return await prisma.social_families.findUnique({
      where: { id: membership.familyId }
    });
  }

  // --- ROLE MANAGEMENT ---

  private static async positionSocialRole(guild: any, role: any) {
    try {
      const context = tenantStorage.getStore();
      let tenantId = context?.tenantId;
      if (!tenantId) {
        const { RoutingService } = await import('../../../services/RoutingService');
        tenantId = await RoutingService.resolveTenantId(guild.id, 'social');
      }
      if (!tenantId) return;

      const settings = await prisma.guild_settings.findUnique({
        where: { guildId_tenantId: { guildId: guild.id, tenantId } }
      });

      if (settings) {
        if (settings.socialHeaderRoleId) {
          const headerRole = await guild.roles.fetch(settings.socialHeaderRoleId).catch(() => null);
          if (headerRole) {
            await role.setPosition(headerRole.position - 1).catch(() => {});
          }
        } else if (settings.socialFooterRoleId) {
          const footerRole = await guild.roles.fetch(settings.socialFooterRoleId).catch(() => null);
          if (footerRole) {
            await role.setPosition(footerRole.position + 1).catch(() => {});
          }
        }
      }
    } catch (err) {
      Logger.warn(`Failed to adjust Social role hierarchy position: ${err}`);
    }
  }

  static async syncMarriageRole(guild: any, user1Id: string, user2Id: string) {
    const roleName = 'Married';
    let role = guild.roles.cache.find((r: any) => r.name === roleName);
    
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        color: '#FF69B4',
        reason: 'Social Engine: Global marriage role creation'
      });
      await this.positionSocialRole(guild, role);
    }

    const member1 = await guild.members.fetch(user1Id).catch(() => null);
    const member2 = await guild.members.fetch(user2Id).catch(() => null);

    if (member1) await member1.roles.add(role);
    if (member2) await member2.roles.add(role);
  }

  static async syncFamilyRole(guild: any, familyName: string, userId: string) {
    const roleName = `Family: ${familyName}`;
    let role = guild.roles.cache.find((r: any) => r.name === roleName);
    
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        color: '#F1C40F',
        reason: `Social Engine: Family role creation for ${familyName}`
      });
      await this.positionSocialRole(guild, role);
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.add(role);
  }

  static async removeFamilyRole(guild: any, familyName: string, userId: string) {
    const roleName = `Family: ${familyName}`;
    const role = guild.roles.cache.find((r: any) => r.name === roleName);
    if (!role) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await member.roles.remove(role);
  }

  // --- RIVALRY COMPETITION ---

  static async recordCompetitiveAction(tenantId: string, guildId: string, userId: string, amount: number) {
    // 1. Friend Rivalry
    const friendship = await prisma.social_friends.findFirst({
      where: {
        guildId,
        tenantId,
        status: 'rivals',
        OR: [{ user1Id: userId }, { user2Id: userId }]
      }
    });

    if (friendship) {
      const scores = (friendship.metadata as any)?.rivalScores || {};
      scores[userId] = (scores[userId] || 0) + amount;
      await prisma.social_friends.update({
        where: { id: friendship.id },
        data: { metadata: { ...((friendship.metadata as any) || {}), rivalScores: scores } }
      });
    }

    // 2. Family Rivalry
    const membership = await prisma.social_family_members.findFirst({
      where: { userId }
    });

    if (membership) {
      const rivalry = await prisma.social_family_rivalries.findFirst({
        where: {
          guildId,
          tenantId,
          status: 'active',
          OR: [{ family1Id: membership.familyId }, { family2Id: membership.familyId }]
        }
      });

      if (rivalry) {
        const scores = (rivalry.metadata as any)?.rivalScores || {};
        scores[membership.familyId] = (scores[membership.familyId] || 0) + amount;
        await prisma.social_family_rivalries.update({
          where: { id: rivalry.id },
          data: { metadata: { ...((rivalry.metadata as any) || {}), rivalScores: scores } }
        });
      }
    }
  }

  static async resolveWeeklyRivalries() {
    // This would be called by a cron job
    const activeFriendRivalries = await prisma.social_friends.findMany({ where: { status: 'rivals' } });
    for (const r of activeFriendRivalries) {
      // Resolve logic: find winner, apply debuff to metadata of loser
      const scores = (r.metadata as any)?.rivalScores || {};
      // Reset scores for next week
      await prisma.social_friends.update({
        where: { id: r.id },
        data: { metadata: { ...((r.metadata as any) || {}), rivalScores: {}, lastWinnerId: scores[r.user1Id] > (scores[r.user2Id] || 0) ? r.user1Id : r.user2Id } }
      });
    }
  }
}
