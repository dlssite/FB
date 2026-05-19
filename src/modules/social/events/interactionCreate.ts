import { Interaction, MessageFlags } from 'discord.js';
import { RoutingService } from '../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { SocialService } from '../services/SocialService';
import { prisma } from '../../../database/client';
import { tenantStorage } from '../../../utils/context';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const customId = (interaction as any).customId;
    if (!customId) return;

    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    return await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
      // --- MARRIAGE ACCEPTANCE ---
      if (customId.startsWith('social_marry_accept_')) {
        try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const marriageId = parseInt(customId.replace('social_marry_accept_', ''), 10);

      const marriage = await prisma.social_marriages.findUnique({ where: { id: marriageId } });
      if (!marriage) return await replyV2(interaction, ContainerService.simple('❌ This proposal has vanished into the ether.'));

      // Ensure only the target can accept
      const targetId = marriage.user1Id === marriage.user1Id ? (interaction.user.id === marriage.user1Id ? marriage.user2Id : marriage.user1Id) : '';
      // Wait, let's just check if user is either user1 or user2 AND not the proposer
      // Actually, user1 is usually proposer in proposeMarriage logic if I didn't sort.
      // But I did sort. So we need to check if interaction.user.id is in the marriage AND didn't propose it?
      // No, let's keep it simple: any of the two can accept if status is pending? 
      // No, only the person who was ASKED should accept.
      // I'll need to store who proposed in metadata.
      
      const proposerId = (marriage.metadata as any)?.proposerId;
      if (interaction.user.id === proposerId) {
        return await replyV2(interaction, ContainerService.simple('❌ You cannot accept your own proposal! Patience...'));
      }

      if (interaction.user.id !== marriage.user1Id && interaction.user.id !== marriage.user2Id) {
        return await replyV2(interaction, ContainerService.simple('❌ This proposal is not for you.'));
      }

      await SocialService.acceptMarriage(tenantId, guildId, marriage.user1Id, marriage.user2Id);
      
      // Auto-Role Sync
      await SocialService.syncMarriageRole(interaction.guild, marriage.user1Id, marriage.user2Id);

      return await replyV2(interaction, ContainerService.create({
        title: '🎊 A Union Confirmed!',
        description: `The heavens rejoice! <@${marriage.user1Id}> and <@${marriage.user2Id}> are now officially joined in marriage.`,
        color: '#FF69B4',
        interaction,
        footer: true
      }));
    }

    // --- MARRIAGE REJECTION ---
    if (customId.startsWith('social_marry_reject_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const marriageId = parseInt(customId.replace('social_marry_reject_', ''), 10);

      await prisma.social_marriages.delete({ where: { id: marriageId } });

      return await replyV2(interaction, ContainerService.create({
        title: '💔 Proposal Declined',
        description: `The offer of marriage was gently declined. Life continues...`,
        color: '#95A5A6',
        interaction,
        footer: true
      }));
    }

    // --- FRIEND ACCEPTANCE ---
    if (customId.startsWith('social_friend_accept_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const friendshipId = parseInt(customId.replace('social_friend_accept_', ''), 10);

      const friendship = await prisma.social_friends.findUnique({ where: { id: friendshipId } });
      if (!friendship) return await replyV2(interaction, ContainerService.simple('❌ This request has expired.'));

      const requesterId = (friendship.metadata as any)?.requesterId;
      if (interaction.user.id === requesterId) {
        return await replyV2(interaction, ContainerService.simple('❌ You cannot accept your own request.'));
      }

      if (interaction.user.id !== friendship.user1Id && interaction.user.id !== friendship.user2Id) {
        return await replyV2(interaction, ContainerService.simple('❌ This request is not for you.'));
      }

      // Senior Check: Verify capacity again at acceptance
      const { TerritoryBuildingService } = await import('../../territory/services/TerritoryBuildingService');
      const cap = await TerritoryBuildingService.getUserFriendCapacity(tenantId, guildId, interaction.user.id);
      
      const friendCount = await prisma.social_friends.count({
        where: { 
          guildId, 
          tenantId, 
          status: 'accepted',
          OR: [{ user1Id: interaction.user.id }, { user2Id: interaction.user.id }]
        }
      });

      if (friendCount >= cap) {
        return await replyV2(interaction, ContainerService.simple(`❌ You have reached your social capacity limit (**${cap}**). You must expand your infrastructure to accept more friends.`));
      }

      await SocialService.acceptFriendRequest(tenantId, guildId, friendship.user1Id, friendship.user2Id);

      return await replyV2(interaction, ContainerService.create({
        title: '🤝 Connection Established',
        description: `You and <@${requesterId === friendship.user1Id ? friendship.user2Id : friendship.user1Id}> are now officially friends!`,
        color: '#3498DB',
        interaction,
        footer: true
      }));
    }

    // --- FRIEND REJECTION ---
    if (customId.startsWith('social_friend_reject_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const friendshipId = parseInt(customId.replace('social_friend_reject_', ''), 10);

      await prisma.social_friends.delete({ where: { id: friendshipId } });

      return await replyV2(interaction, ContainerService.create({
        title: '❌ Request Declined',
        description: `The friend request was declined.`,
        color: '#95A5A6',
        interaction,
        footer: true
      }));
    }

    // --- DIVORCE INITIATION ---
    if (customId.startsWith('social_marry_divorce_confirm_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const marriageId = parseInt(customId.replace('social_marry_divorce_confirm_', ''), 10);

      const marriage = await prisma.social_marriages.findUnique({ where: { id: marriageId } });
      if (!marriage || marriage.status !== 'married') return await replyV2(interaction, ContainerService.simple('❌ This marriage record is no longer active.'));

      if (marriage.status === 'divorce_pending') {
        // Second partner confirming
        if (interaction.user.id === (marriage.metadata as any)?.divorceRequesterId) {
          return await replyV2(interaction, ContainerService.simple('❌ You have already confirmed. Waiting for your partner.'));
        }

        // Archive to history
        await prisma.social_marriage_history.create({
          data: {
            tenantId,
            guildId,
            user1Id: marriage.user1Id,
            user2Id: marriage.user2Id,
            peakResonance: marriage.resonanceScore,
            marriedAt: marriage.marriedAt || marriage.createdAt
          }
        });

        await prisma.social_marriages.delete({ where: { id: marriageId } });
        
        return await replyV2(interaction, ContainerService.create({
          title: '💔 Union Dissolved',
          description: `The marriage between <@${marriage.user1Id}> and <@${marriage.user2Id}> has officially ended.`,
          color: '#E74C3C',
          interaction,
          footer: true
        }));
      } else {
        // First partner initiating
        await prisma.social_marriages.update({
          where: { id: marriageId },
          data: { 
            status: 'divorce_pending',
            metadata: { ...((marriage.metadata as any) || {}), divorceRequesterId: interaction.user.id }
          }
        });

        return await replyV2(interaction, ContainerService.create({
          title: '💔 Divorce Pending',
          description: `A divorce request has been logged. Your partner must now confirm the dissolution.`,
          color: '#E74C3C',
          interaction,
          footer: true
        }));
      }
    }

    // --- FAMILY JOIN (Open) ---
    if (customId.startsWith('social_family_join_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const familyId = parseInt(customId.replace('social_family_join_', ''), 10);

      const family = await prisma.social_families.findUnique({ where: { id: familyId } });
      if (!family) return await replyV2(interaction, ContainerService.simple('❌ This dynasty has fallen.'));

      const existing = await SocialService.getFamilyByMember(interaction.user.id);
      if (existing) return await replyV2(interaction, ContainerService.simple('❌ You are already part of a dynasty.'));

      await prisma.social_family_members.create({
        data: { familyId, userId: interaction.user.id, role: 'member', status: 'accepted' }
      });

      await SocialService.syncFamilyRole(interaction.guild, family.name, interaction.user.id);

      return await replyV2(interaction, ContainerService.create({
        title: '👨‍👩‍👧‍👦 New Member Joined',
        description: `Welcome to the legacy, <@${interaction.user.id}>! You are now a member of the **${family.name}** dynasty.`,
        color: '#F1C40F',
        interaction,
        footer: true
      }));
    }

    // --- FAMILY INVITE ACCEPTANCE ---
    if (customId.startsWith('social_family_accept_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const familyId = parseInt(customId.replace('social_family_accept_', ''), 10);

      const family = await prisma.social_families.findUnique({ where: { id: familyId } });
      if (!family) return await replyV2(interaction, ContainerService.simple('❌ This dynasty has fallen.'));

      await prisma.social_family_members.update({
        where: { familyId_userId: { familyId, userId: interaction.user.id } },
        data: { status: 'accepted', joinedAt: new Date() }
      });

      await SocialService.syncFamilyRole(interaction.guild, family.name, interaction.user.id);

      return await replyV2(interaction, ContainerService.create({
        title: '🎊 Invitation Accepted',
        description: `You have joined the **${family.name}** dynasty. May your legacy endure!`,
        color: '#F1C40F',
        interaction,
        footer: true
      }));
    }

    // --- FAMILY INVITE REJECTION ---
    if (customId.startsWith('social_family_reject_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const familyId = parseInt(customId.replace('social_family_reject_', ''), 10);

      await prisma.social_family_members.delete({
        where: { familyId_userId: { familyId, userId: interaction.user.id } }
      });

      return await replyV2(interaction, ContainerService.simple('❌ You have declined the family invitation.'));
    }

    // --- DIVORCE REJECTION ---
    if (customId.startsWith('social_marry_divorce_reject_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const marriageId = parseInt(customId.replace('social_marry_divorce_reject_', ''), 10);

      await prisma.social_marriages.update({
        where: { id: marriageId },
        data: { 
          status: 'married',
          metadata: { } // Clear divorce requester
        }
      });

      return await replyV2(interaction, ContainerService.create({
        title: '❤️ Union Saved',
        description: `The divorce request was declined. Your marriage remains intact.`,
        color: '#2ECC71',
        interaction,
        footer: true
      }));
    }

    // --- FAMILY RIVALRY ACCEPTANCE ---
    if (customId.startsWith('social_family_rival_accept_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const parts = customId.split('_');
      const challengerId = parseInt(parts[4], 10);
      const targetId = parseInt(parts[5], 10);

      // Check if interaction user is a head of the target family
      const membership = await prisma.social_family_members.findUnique({
        where: { familyId_userId: { familyId: targetId, userId: interaction.user.id } }
      });
      if (membership?.role !== 'head') return await replyV2(interaction, ContainerService.simple('❌ Only family heads can accept rivalries.'));

      const sorted = [challengerId, targetId].sort();

      await prisma.social_family_rivalries.upsert({
        where: { family1Id_family2Id_guildId_tenantId: { family1Id: sorted[0], family2Id: sorted[1], guildId, tenantId } },
        update: { status: 'active', startedAt: new Date() },
        create: { tenantId, guildId, family1Id: sorted[0], family2Id: sorted[1], status: 'active', startedAt: new Date() }
      });

      const challenger = await prisma.social_families.findUnique({ where: { id: challengerId } });
      const target = await prisma.social_families.findUnique({ where: { id: targetId } });

      return await replyV2(interaction, ContainerService.create({
        title: '⚔️ War Declared!',
        description: `The **${target?.name}** family has accepted the challenge from the **${challenger?.name}** dynasty!\n\nTheir rivalry is now active. May the strongest legacy prevail.`,
        color: '#E67E22',
        interaction,
        footer: true
      }));
    }

    // --- FAMILY VOTE CLAIM ---
    if (customId.startsWith('social_family_vote_claim_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      const parts = customId.split('_');
      const familyId = parseInt(parts[4], 10);
      const nationId = parseInt(parts[5], 10);

      // Check if voter is in family
      const membership = await prisma.social_family_members.findUnique({
        where: { familyId_userId: { familyId, userId: interaction.user.id } }
      });
      if (!membership) return await replyV2(interaction, ContainerService.simple('❌ You are not a member of this family.'));

      const family = await prisma.social_families.findUnique({ where: { id: familyId } });
      if (!family) return;

      const votes = (family.metadata as any)?.claimVotes || [];
      if (votes.includes(interaction.user.id)) {
        return await replyV2(interaction, ContainerService.simple('❌ You have already voted.'));
      }

      const newVotes = [...votes, interaction.user.id];
      const requiredVotes = 3; // Simplified majority threshold

      if (newVotes.length >= requiredVotes) {
        await prisma.social_families.update({
          where: { id: familyId },
          data: { 
            nationId, 
            metadata: { ...((family.metadata as any) || {}), claimVotes: [] } // Reset votes
          }
        });

        return await replyV2(interaction, ContainerService.create({
          title: '🚩 Territory Claimed!',
          description: `The **${family.name}** dynasty has successfully claimed their home territory!\n\nThey now reign over this nation.`,
          color: '#F1C40F',
          interaction,
          footer: true
        }));
      } else {
        await prisma.social_families.update({
          where: { id: familyId },
          data: { metadata: { ...((family.metadata as any) || {}), claimVotes: newVotes } }
        });

        return await replyV2(interaction, ContainerService.simple(`✅ Vote recorded. **${newVotes.length} / ${requiredVotes}** votes received.`));
      }
    }

    // --- DIRECT GIFT USAGE (FROM INVENTORY) ---
    if (interaction.isStringSelectMenu() && customId.startsWith('social_gift_use_')) {
      try { await (interaction as any).deferUpdate(); } catch (e) { return; }
      
      const instanceId = customId.replace('social_gift_use_', '');
      const targetUserId = interaction.values[0];
      const { InventoryService } = await import('../../shop/services/InventoryService');
      
      const instance = await InventoryService.getHydratedInstance(instanceId);
      if (!instance) return await replyV2(interaction, ContainerService.simple('❌ Gift Error: Item not found.'));

      const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
      if (!targetUser) return await replyV2(interaction, ContainerService.simple('❌ Gift Error: Target user not found.'));

      // Check for relationship types
      const friendship = await SocialService.getFriendship(tenantId, guildId, interaction.user.id, targetUserId);
      const marriage = await prisma.social_marriages.findFirst({
        where: { guildId, tenantId, status: 'married', OR: [{ user1Id: interaction.user.id, user2Id: targetUserId }, { user1Id: targetUserId, user2Id: interaction.user.id }] }
      });
      const [senderMembership, targetMembership] = await Promise.all([
        prisma.social_family_members.findFirst({ where: { userId: interaction.user.id, status: 'accepted' } }),
        prisma.social_family_members.findFirst({ where: { userId: targetUserId, status: 'accepted' } })
      ]);

      let applied = false;
      let boostType = '';
      let boostAmount = 0;

      // Prioritize Marriage -> Family -> Friendship
      if (marriage && instance.metadata.resonanceBonus) {
        boostAmount = instance.metadata.resonanceBonus;
        await prisma.social_marriages.update({ where: { id: marriage.id }, data: { resonanceScore: { increment: boostAmount } } });
        boostType = 'Resonance';
        applied = true;
      } else if (senderMembership && targetMembership && senderMembership.familyId === targetMembership.familyId && instance.metadata.reputationBonus) {
        boostAmount = instance.metadata.reputationBonus;
        const family = await prisma.social_families.findUnique({ where: { id: senderMembership.familyId } });
        const currentRep = (family?.metadata as any)?.reputation || 0;
        await prisma.social_families.update({ where: { id: senderMembership.familyId }, data: { metadata: { ...((family?.metadata as any) || {}), reputation: currentRep + boostAmount } } });
        boostType = 'Family Reputation';
        applied = true;
      } else if (friendship?.status === 'accepted' && instance.metadata.bondBonus) {
        boostAmount = instance.metadata.bondBonus;
        await prisma.social_friends.update({ where: { id: friendship.id }, data: { bondScore: { increment: boostAmount } } });
        boostType = 'Bond Score';
        applied = true;
      }

      if (!applied) {
        return await replyV2(interaction, ContainerService.simple('❌ This item cannot be gifted to this user (No valid relationship or missing bonus metadata).'), true);
      }

      // Consume item
      await prisma.shop_inventory.delete({ where: { id: instanceId } });

      return await replyV2(interaction, ContainerService.create({
        title: '🎁 Gift Delivered',
        description: `You used **${instance.name}** for ${targetUser}!\n\nYour **${boostType}** has increased by **${boostAmount}**.`,
        color: '#FF69B4',
        interaction,
        footer: true
      }));
      }
    });
  }
};
