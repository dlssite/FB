import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('rival')
       .setDescription('⚔️ Declare a rivalry with another user.')
       .addUserOption(opt => opt.setName('user').setDescription('The user to declare as a rival').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    if (targetUser.id === user.id) return await replyV2(interaction, ContainerService.simple('❌ You cannot be your own rival.'));

    const sorted = [user.id, targetUser.id].sort();
    
    await prisma.social_friends.upsert({
      where: { user1Id_user2Id_guildId_tenantId: { user1Id: sorted[0], user2Id: sorted[1], guildId, tenantId } },
      update: { status: 'rivals' },
      create: { tenantId, guildId, user1Id: sorted[0], user2Id: sorted[1], status: 'rivals' }
    });

    return await replyV2(interaction, ContainerService.create({
      title: '⚔️ Rivalry Declared',
      description: `${user} and ${targetUser} are now officially **Rivals**.\n\nWeekly XP tallies will now track who reigns supreme in this sector.`,
      color: '#E67E22',
      interaction,
      footer: true
    }));
  }
};
