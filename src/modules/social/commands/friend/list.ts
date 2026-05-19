import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('list')
       .setDescription('🤝 View your list of friends and bond scores.'),

  async execute(interaction: any) {
    const { guildId, user } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const friends = await prisma.social_friends.findMany({
      where: {
        guildId,
        tenantId,
        status: 'accepted',
        OR: [
          { user1Id: user.id },
          { user2Id: user.id }
        ]
      },
      orderBy: { bondScore: 'desc' }
    });

    if (!friends.length) {
      return await replyV2(interaction, ContainerService.simple('🤝 You haven\'t established any social bonds yet. Use `/friend add` to start!'));
    }

    const friendList = friends.map(f => {
      const friendId = f.user1Id === user.id ? f.user2Id : f.user1Id;
      const score = f.bondScore;
      let tier = '🤝 Acquaintance';
      if (score >= 1000) tier = '🌟 Best Friend';
      else if (score >= 250) tier = '💛 Close Friend';
      else if (score >= 50) tier = '🧑‍🤝‍🧑 Friend';
      
      return `**${tier}**: <@${friendId}> — Bond Score: **${score}**`;
    }).join('\n');

    return await replyV2(interaction, ContainerService.create({
      title: '🤝 Your Social Network',
      description: `List of active bonds in this sector:\n\n${friendList}`,
      color: '#3498DB',
      interaction,
      footer: true
    }));
  }
};
