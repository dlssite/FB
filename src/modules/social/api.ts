import { Hono } from 'hono';
import { prisma } from '../../database/client';

const api = new Hono();

/**
 * GET /api/social/profile/:guildId/:userId
 * Returns the full social profile of a user (Friends, Spouse, Family).
 */
api.get('/profile/:guildId/:userId', async (c) => {
  const { guildId, userId } = c.req.param();
  const tenantId = 'tenant_alpha_01'; // Should be resolved from headers

  const [friends, marriage, familyMembership] = await Promise.all([
    prisma.social_friends.findMany({
      where: { guildId, tenantId, status: 'accepted', OR: [{ user1Id: userId }, { user2Id: userId }] }
    }),
    prisma.social_marriages.findFirst({
      where: { guildId, tenantId, status: 'married', OR: [{ user1Id: userId }, { user2Id: userId }] }
    }),
    prisma.social_family_members.findFirst({
      where: { userId, status: 'accepted' },
      include: { family: true }
    })
  ]);

  return c.json({
    success: true,
    data: {
      userId,
      friends: friends.map(f => ({
        id: f.id,
        friendId: f.user1Id === userId ? f.user2Id : f.user1Id,
        bondScore: f.bondScore,
        metAt: f.createdAt
      })),
      marriage: marriage ? {
        id: marriage.id,
        spouseId: marriage.user1Id === userId ? marriage.user2Id : marriage.user1Id,
        resonance: marriage.resonanceScore,
        marriedAt: marriage.marriedAt
      } : null,
      family: familyMembership ? {
        id: familyMembership.familyId,
        name: familyMembership.family.name,
        role: familyMembership.role,
        joinedAt: familyMembership.joinedAt
      } : null
    }
  });
});

/**
 * GET /api/social/families/:guildId
 * Lists all active families in a guild.
 */
api.get('/families/:guildId', async (c) => {
  const { guildId } = c.req.param();
  const tenantId = 'tenant_alpha_01';

  const families = await prisma.social_families.findMany({
    where: { guildId, tenantId },
    include: { _count: { select: { members: true } } }
  });

  return c.json({
    success: true,
    families: families.map(f => ({
      id: f.id,
      name: f.name,
      memberCount: f._count.members,
      createdAt: f.createdAt
    }))
  });
});

export default api;
