import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('remove')
       .setDescription('🤝 Remove a user from your friends list.')
       .addUserOption(opt => opt.setName('user').setDescription('The friend to remove').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const sorted = [user.id, targetUser.id].sort();

    const friendship = await prisma.social_friends.findUnique({
      where: { 
        user1Id_user2Id_guildId_tenantId: { 
          user1Id: sorted[0], 
          user2Id: sorted[1], 
          guildId, 
          tenantId 
        } 
      }
    });

    if (!friendship) {
      return await replyV2(interaction, ContainerService.simple('❌ This user is not on your friends list.'));
    }

    await prisma.social_friends.delete({ where: { id: friendship.id } });

    return await replyV2(interaction, ContainerService.simple(`✅ You are no longer friends with ${targetUser}.`));
  }
};
