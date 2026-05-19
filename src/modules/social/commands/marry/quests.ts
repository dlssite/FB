import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('quests')
       .setDescription('💞 View active objectives for your marriage.'),

  async execute(interaction: any) {
    const { guildId, user } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const marriage = await prisma.social_marriages.findFirst({
      where: {
        guildId,
        tenantId,
        status: 'married',
        OR: [{ user1Id: user.id }, { user2Id: user.id }]
      }
    });

    if (!marriage) return await replyV2(interaction, ContainerService.simple('❌ You must be married to view couple quests.'));

    const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;

    // For now, these are dynamic "Daily Objectives" based on marriage state
    const quests = [
      { name: '🎁 Generosity', description: `Gift an item to <@${partnerId}> using \`/marry gift\``, reward: '100 Resonance' },
      { name: '🤝 Co-Presence', description: `Be in the same nation as <@${partnerId}> at the same time`, reward: '50 Resonance' },
      { name: '🏦 Investment', description: `Deposit at least 1,000 Embers into the joint vault`, reward: '25 Resonance' }
    ];

    const questList = quests.map(q => `**${q.name}**\n*${q.description}*\nReward: **${q.reward}**`).join('\n\n');

    return await replyV2(interaction, ContainerService.create({
      title: '💞 Couple Objectives',
      description: `Complete these tasks with your partner to strengthen your union:\n\n${questList}`,
      color: '#FF69B4',
      interaction,
      footer: true
    }));
  }
};
