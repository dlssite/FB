import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('add')
       .setDescription('🤝 Send a friend request to another user.')
       .addUserOption(opt => 
         opt.setName('user')
            .setDescription('The user you want to add as a friend')
            .setRequired(true)
       ),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    
    if (targetUser.id === user.id) {
      return await replyV2(interaction, ContainerService.simple('❌ You are already your own best friend.'));
    }

    if (targetUser.bot) {
      return await replyV2(interaction, ContainerService.simple('❌ Bots are efficient, but not very good at being friends.'));
    }

    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Check Capacity
    const { TerritoryBuildingService } = await import('../../../territory/services/TerritoryBuildingService');
    const cap = await TerritoryBuildingService.getUserFriendCapacity(tenantId, guildId, user.id);
    
    const friendCount = await prisma.social_friends.count({
      where: { 
        guildId, 
        tenantId, 
        status: 'accepted',
        OR: [{ user1Id: user.id }, { user2Id: user.id }]
      }
    });

    if (friendCount >= cap) {
      return await replyV2(interaction, ContainerService.simple(`❌ You have reached your social capacity limit (**${cap}** friends). Deploy more Outposts or buildings to expand your network!`));
    }

    // 2. Create a pending friend request
    const friendship = await SocialService.sendFriendRequest(tenantId, guildId, user.id, targetUser.id);
    
    // Update metadata with requesterId
    await prisma.social_friends.update({
      where: { id: friendship.id },
      data: { metadata: { requesterId: user.id } }
    });

    const acceptBtn = new ButtonBuilder()
      .setCustomId(`social_friend_accept_${friendship.id}`)
      .setLabel('Accept Request')
      .setEmoji('🤝')
      .setStyle(ButtonStyle.Success);

    const rejectBtn = new ButtonBuilder()
      .setCustomId(`social_friend_reject_${friendship.id}`)
      .setLabel('Decline')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptBtn, rejectBtn);

    // 3. DM Notification
    await targetUser.send(`🤝 **New Friend Request!**\n${user.username} wants to be your friend in **${interaction.guild.name}**.\nCheck the social channel to accept!`).catch(() => {});

    return await replyV2(interaction, ContainerService.create({
      title: '🤝 New Friend Request',
      description: `${user} wants to be your friend!\n\nBuilding bonds unlocks shared perks like hangar access. Do you accept?`,
      color: '#3498DB',
      components: [row],
      interaction,
      footer: true,
      thumbnail: user.displayAvatarURL()
    }));
  }
};
