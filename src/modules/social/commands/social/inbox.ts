import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('inbox')
       .setDescription('📨 View and manage your pending social requests.'),
  ephemeral: true,

  async execute(interaction: any) {
    const { guildId, user } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Fetch all pending requests
    const [friendRequests, marriages, familyInvites] = await Promise.all([
      prisma.social_friends.findMany({
        where: { 
          guildId, 
          tenantId, 
          status: 'pending', 
          OR: [{ user1Id: user.id }, { user2Id: user.id }] 
        }
      }),
      prisma.social_marriages.findMany({
        where: { 
          guildId, 
          tenantId, 
          AND: [
            { OR: [{ status: 'pending' }, { status: 'divorce_pending' }] },
            { OR: [{ user1Id: user.id }, { user2Id: user.id }] }
          ]
        }
      }),
      prisma.social_family_members.findMany({
        where: { userId: user.id, status: 'pending' },
        include: { family: true }
      })
    ]);

    // 2. Filter out requests where the user is the sender (except for divorce where both must confirm)
    const pendingFriends = friendRequests.filter(f => (f.metadata as any)?.requesterId !== user.id);
    const pendingMarriages = marriages.filter(m => m.status === 'pending' && (m.metadata as any)?.proposerId !== user.id);
    const pendingDivorces = marriages.filter(m => m.status === 'divorce_pending' && (m.metadata as any)?.divorceRequesterId !== user.id);

    const total = pendingFriends.length + pendingMarriages.length + pendingDivorces.length + familyInvites.length;

    if (total === 0) {
      return await replyV2(interaction, ContainerService.simple('📬 Your inbox is empty. No pending social requests found.'));
    }

    // 3. Render the first request found
    let title = '';
    let description = '';
    let color = '#7367F0';
    let customIdPrefix = '';
    let requestId = 0;

    if (pendingFriends.length > 0) {
      const f = pendingFriends[0];
      const otherId = f.user1Id === user.id ? f.user2Id : f.user1Id;
      title = '🤝 Friend Request';
      description = `<@${otherId}> wants to be your friend.`;
      color = '#3498DB';
      customIdPrefix = 'social_friend';
      requestId = f.id;
    } else if (pendingMarriages.length > 0) {
      const m = pendingMarriages[0];
      const otherId = m.user1Id === user.id ? m.user2Id : m.user1Id;
      title = '💍 Marriage Proposal';
      description = `<@${otherId}> has proposed a union with you.`;
      color = '#FF69B4';
      customIdPrefix = 'social_marry';
      requestId = m.id;
    } else if (pendingDivorces.length > 0) {
      const d = pendingDivorces[0];
      const otherId = d.user1Id === user.id ? d.user2Id : d.user1Id;
      title = '💔 Divorce Confirmation';
      description = `<@${otherId}> has initiated a divorce. Do you confirm the dissolution?`;
      color = '#E74C3C';
      customIdPrefix = 'social_marry_divorce';
      requestId = d.id;
    } else if (familyInvites.length > 0) {
      const i = familyInvites[0];
      title = '👨‍👩‍👧‍👦 Family Invitation';
      description = `You have been invited to join the **${(i as any).family.name}** dynasty.`;
      color = '#F1C40F';
      customIdPrefix = 'social_family';
      requestId = i.familyId;
    }

    const acceptBtn = new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_accept_${requestId}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);

    const declineBtn = new ButtonBuilder()
      .setCustomId(`${customIdPrefix}_reject_${requestId}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptBtn, declineBtn);

    return await replyV2(interaction, ContainerService.create({
      title,
      description: `${description}\n\n*You have **${total}** total pending requests.*`,
      color,
      components: [row],
      interaction,
      footer: true
    }), true);
  }
};
