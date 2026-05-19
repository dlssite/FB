import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('profile')
       .setDescription('👤 View your social bond profile with a friend.')
       .addUserOption(opt => opt.setName('user').setDescription('The friend whose profile you want to view').setRequired(true)),

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const friendship = await SocialService.getFriendship(tenantId, guildId, user.id, targetUser.id);

    if (!friendship || friendship.status === 'pending') {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have an active bond with this user.'));
    }

    const score = friendship.bondScore;
    let tier = '🤝 Acquaintance';
    let nextTier = '🧑‍🤝‍🧑 Friend (50)';
    let perks = '• No perks unlocked yet.';

    if (score >= 1000) {
      tier = '🌟 Best Friend';
      nextTier = 'MAX LEVEL';
      perks = '• See location\n• +5% XP Bonus\n• **Shared Hangar Access**';
    } else if (score >= 250) {
      tier = '💛 Close Friend';
      nextTier = '🌟 Best Friend (1000)';
      perks = '• See location\n• **+5% XP Bonus** when together';
    } else if (score >= 50) {
      tier = '🧑‍🤝‍🧑 Friend';
      nextTier = '💛 Close Friend (250)';
      perks = '• **See location** (Nation)';
    }

    const fields = [
      { name: '📊 Bond Score', value: `**${score}**`, inline: true },
      { name: '🏆 Current Tier', value: `**${tier}**`, inline: true },
      { name: '🚀 Next Milestone', value: nextTier, inline: true },
      { name: '✨ Unlocked Perks', value: perks, inline: false }
    ];

    return await replyV2(interaction, ContainerService.create({
      title: `Social Bond: ${targetUser.username}`,
      description: `Analyzing social resonance between ${user} and ${targetUser}.`,
      fields,
      color: '#3498DB',
      interaction,
      footer: true,
      thumbnail: targetUser.displayAvatarURL()
    }));
  }
};
