import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('wishes')
       .setDescription("💌 View the Birthday Wish Wall for a user.")
       .addUserOption(opt => opt.setName('user').setDescription('The user whose wishes you want to see').setRequired(false)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const currentYear = new Date().getFullYear();

    const wishes = await prisma.birthday_wishes.findMany({
      where: {
        tenantId: context.tenantId,
        guildId: context.guildId,
        recipientId: targetUser.id,
        year: currentYear
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (wishes.length === 0) {
      return replyV2(interaction, ContainerService.simple(`💌 No wishes have been sent to **${targetUser.username}** for the ${currentYear} celebration yet.`));
    }

    const wishList = wishes.map(w => `<@${w.senderId}> — "${w.message}"`).join('\n\n');

    const container = ContainerService.create({
      title: `💌 Wish Wall — ${targetUser.username}`,
      description: `**${currentYear} Celebration · ${wishes.length} Wishes**\n\n${wishList}`,
      color: '#FFB600',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
