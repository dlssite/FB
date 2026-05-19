import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('profile')
       .setDescription('👨‍👩‍👧‍👦 View a family dynasty profile.')
       .addUserOption(opt => 
         opt.setName('user')
            .setDescription('The user whose family profile you want to view')
       ),

  async execute(interaction: any) {
    const { guildId, options } = interaction;
    const targetUser = options.getUser('user') || interaction.user;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const family = await SocialService.getFamilyByMember(targetUser.id);

    if (!family) {
      return await replyV2(interaction, ContainerService.simple('❌ This user is not part of any family dynasty.'));
    }

    const members = await prisma.social_family_members.findMany({
      where: { familyId: family.id }
    });

    const fields = [
      { name: '👑 Leadership', value: `<@${family.head1Id}>${family.head2Id ? ` & <@${family.head2Id}>` : ''}`, inline: true },
      { name: '👥 Members', value: `**${members.length}** / 10`, inline: true },
      { name: '💰 Treasury', value: `**${Number(family.treasuryBalance).toLocaleString()}** Embers`, inline: true },
      { name: '🏳️ Territory', value: family.nationId ? `Nation ID: ${family.nationId}` : 'No claims yet', inline: true }
    ];

    return await replyV2(interaction, ContainerService.create({
      title: `👨‍👩‍👧‍👦 Dynasty: ${family.name}`,
      description: `Detailed intelligence on the **${family.name}** family legacy.`,
      fields,
      color: '#F1C40F',
      interaction,
      footer: true
    }));
  }
};
