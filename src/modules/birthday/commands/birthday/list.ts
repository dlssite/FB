import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { BirthdayService } from '../../services/BirthdayService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('list')
       .setDescription('📅 See a list of upcoming birthdays.'),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const birthdays = await prisma.user_birthdays.findMany({
      where: {
        tenantId: context.tenantId,
        guildId: context.guildId
      }
    });

    if (birthdays.length === 0) {
      return replyV2(interaction, ContainerService.simple('📅 No birthdays have been registered in this server yet.'));
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sortedBirthdays = birthdays.map(b => {
      let next = new Date(now.getFullYear(), b.month - 1, b.day);
      
      // If birthday has passed this year, it's next year. 
      // If it's today, we keep it this year.
      if (next < todayStart) {
        next.setFullYear(now.getFullYear() + 1);
      }

      const diffTime = next.getTime() - todayStart.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...b,
        nextBirthday: next,
        daysUntil: daysUntil
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 15);

    const lines = sortedBirthdays.map(b => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${monthNames[b.month - 1]} ${b.day}`;
      const zodiac = BirthdayService.getZodiac(b.day, b.month).split(' ')[0]; // Just the emoji
      
      let indicator = '🟦';
      if (b.daysUntil === 0) indicator = '🎂';
      else if (b.daysUntil <= 7) indicator = '🟩';
      else if (b.daysUntil <= 30) indicator = '🟨';

      const dayLabel = b.daysUntil === 0 ? '**TODAY!** 🥳' : `in ${b.daysUntil} days`;
      return `${indicator} <@${b.userId}> — ${dayLabel} (${dateStr}) ${zodiac}`;
    });

    const container = ContainerService.create({
      title: '📅 Upcoming Birthdays',
      description: lines.join('\n'),
      color: '#5865F2',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
