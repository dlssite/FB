import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('history')
       .setDescription('📜 View your historical marriage records.'),

  async execute(interaction: any) {
    const { guildId, user } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const history = await prisma.social_marriage_history.findMany({
      where: {
        guildId,
        tenantId,
        OR: [{ user1Id: user.id }, { user2Id: user.id }]
      },
      orderBy: { divorcedAt: 'desc' }
    });

    if (!history.length) {
      return await replyV2(interaction, ContainerService.simple('📜 No historical marriage records found. Your legacy is yet to be written.'));
    }

    const historyList = history.map(h => {
      const partnerId = h.user1Id === user.id ? h.user2Id : h.user1Id;
      return `💍 Partner: <@${partnerId}> | Peak Resonance: **${h.peakResonance}** | Date: ${h.divorcedAt.toLocaleDateString()}`;
    }).join('\n');

    return await replyV2(interaction, ContainerService.create({
      title: '📜 Marriage Annals',
      description: `Historical records for ${user}:\n\n${historyList}`,
      color: '#95A5A6',
      interaction,
      footer: true
    }));
  }
};
