import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('profile')
       .setDescription('👰 View your marriage profile.')
       .addUserOption(opt => 
         opt.setName('user')
            .setDescription('The user whose marriage profile you want to view')
       ),

  async execute(interaction: any) {
    const { guildId, options } = interaction;
    const targetUser = options.getUser('user') || interaction.user;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const marriage = await prisma.social_marriages.findFirst({
      where: {
        guildId,
        tenantId,
        status: 'married',
        OR: [
          { user1Id: targetUser.id },
          { user2Id: targetUser.id }
        ]
      }
    });

    if (!marriage) {
      return await replyV2(interaction, ContainerService.simple('❌ No active marriage found for this user.'));
    }

    const partnerId = marriage.user1Id === targetUser.id ? marriage.user2Id : marriage.user1Id;
    const partner = await interaction.client.users.fetch(partnerId).catch(() => null);

    const marriedFor = marriage.marriedAt 
      ? Math.floor((Date.now() - marriage.marriedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const score = marriage.resonanceScore;
    let tier = '🌱 Newlyweds';
    let perks = '• Shared couple role\n• Public profile';

    if (score >= 1500) {
      tier = '👑 Eternal';
      perks = '• Joint Vault Access\n• +10% Aura XP Boost\n• **Legacy Title & Tax Exemption**';
    } else if (score >= 500) {
      tier = '🔮 Soulmates';
      perks = '• Joint Vault Access\n• **+10% Aura XP Boost**';
    } else if (score >= 100) {
      tier = '💞 Bonded';
      perks = '• **Joint Vault Access**';
    }

    const fields = [
      { name: '💞 Partner', value: partner ? `${partner}` : 'Unknown User', inline: true },
      { name: '🏆 Resonance Tier', value: `**${tier}**`, inline: true },
      { name: '🔮 Resonance Score', value: `**${score}** ❤️`, inline: true },
      { name: '🏦 Joint Vault', value: `**${Number(marriage.vaultBalance).toLocaleString()}** Embers`, inline: true },
      { name: '⏳ Union Duration', value: `**${marriedFor}** Days`, inline: true },
      { name: '✨ Relationship Perks', value: perks, inline: false }
    ];

    return await replyV2(interaction, ContainerService.create({
      title: '💍 Marriage Certificate',
      description: `Official record of union for ${targetUser}.`,
      fields,
      color: '#FF69B4',
      interaction,
      footer: true,
      thumbnail: targetUser.displayAvatarURL()
    }));
  }
};
