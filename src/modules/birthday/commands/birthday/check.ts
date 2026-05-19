import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { BirthdayService } from '../../services/BirthdayService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('check')
       .setDescription("👀 Check your or another user's birthday profile.")
       .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(false)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const birthday = await prisma.user_birthdays.findFirst({
      where: { 
        tenantId: context.tenantId, 
        guildId: context.guildId, 
        userId: targetUser.id 
      }
    });

    if (!birthday) {
      const msg = targetUser.id === interaction.user.id 
        ? "❌ You haven't set your birthday yet! Use `/birthday set`."
        : `❌ **${targetUser.username}** hasn't set their birthday yet.`;
      return replyV2(interaction, ContainerService.simple(msg, { color: 'Red' }));
    }

    // Calculate days until next birthday
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let nextBirthday = new Date(now.getFullYear(), birthday.month - 1, birthday.day);
    
    const isToday = todayStart.getTime() === nextBirthday.getTime();
    
    if (nextBirthday < todayStart) {
      nextBirthday.setFullYear(now.getFullYear() + 1);
    }
    
    const diffTime = nextBirthday.getTime() - todayStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${monthNames[birthday.month - 1]} ${birthday.day}`;
    const zodiac = BirthdayService.getZodiac(birthday.day, birthday.month);
    
    let ageInfo = '';
    if (birthday.year) {
      if (isToday) {
        const age = now.getFullYear() - birthday.year;
        ageInfo = `\n🎂 **Age:** ${age} today!`;
      } else {
        const age = nextBirthday.getFullYear() - birthday.year;
        const targetYear = nextBirthday.getFullYear() === now.getFullYear() ? 'this' : 'next';
        ageInfo = `\n🎂 **Age:** Turning ${age} ${targetYear} year`;
      }
    }

    const nextStr = isToday ? 'Today! 🥳' : `In ${diffDays} days`;

    const container = ContainerService.create({
      title: `🎂 Birthday Profile — ${targetUser.username}`,
      description: `🗓️ **Date:** ${dateStr}\n${zodiac}\n⏳ **Next:** ${nextStr}${ageInfo}\n🥳 **Streak:** ${birthday.streakCount} years`,
      thumbnail: targetUser.displayAvatarURL(),
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
