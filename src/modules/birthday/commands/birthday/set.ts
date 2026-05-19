import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('set')
       .setDescription('📅 Set your birthday.')
       .addIntegerOption(opt => opt.setName('day').setDescription('Day (1-31)').setRequired(true).setMinValue(1).setMaxValue(31))
       .addIntegerOption(opt => opt.setName('month').setDescription('Month (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
       .addIntegerOption(opt => opt.setName('year').setDescription('Year (Optional, for age display)').setRequired(false).setMinValue(1900).setMaxValue(new Date().getFullYear())),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const day = interaction.options.getInteger('day', true);
    const month = interaction.options.getInteger('month', true);
    const year = interaction.options.getInteger('year');

    // Basic date validation
    const dateObj = new Date(year || 2000, month - 1, day);
    if (dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return replyV2(interaction, ContainerService.simple('❌ Invalid date provided.', { color: 'Red' }));
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateStr = `${monthNames[month - 1]} ${day}${year ? `, ${year}` : ''}`;

    // Calculate Zodiac
    const getZodiac = (d: number, m: number) => {
      if ((m == 1 && d <= 20) || (m == 12 && d >= 22)) return { sign: 'Capricorn', emoji: '♑' };
      if ((m == 1 && d >= 21) || (m == 2 && d <= 18)) return { sign: 'Aquarius', emoji: '♒' };
      if ((m == 2 && d >= 19) || (m == 3 && d <= 20)) return { sign: 'Pisces', emoji: '♓' };
      if ((m == 3 && d >= 21) || (m == 4 && d <= 19)) return { sign: 'Aries', emoji: '♈' };
      if ((m == 4 && d >= 20) || (m == 5 && d <= 20)) return { sign: 'Taurus', emoji: '♉' };
      if ((m == 5 && d >= 21) || (m == 6 && d <= 20)) return { sign: 'Gemini', emoji: '♊' };
      if ((m == 6 && d >= 21) || (m == 7 && d <= 22)) return { sign: 'Cancer', emoji: '♋' };
      if ((m == 7 && d >= 23) || (m == 8 && d <= 22)) return { sign: 'Leo', emoji: '♌' };
      if ((m == 8 && d >= 23) || (m == 9 && d <= 22)) return { sign: 'Virgo', emoji: '♍' };
      if ((m == 9 && d >= 23) || (m == 10 && d <= 22)) return { sign: 'Libra', emoji: '♎' };
      if ((m == 10 && d >= 23) || (m == 11 && d <= 21)) return { sign: 'Scorpio', emoji: '♏' };
      if ((m == 11 && d >= 22) || (m == 12 && d <= 21)) return { sign: 'Sagittarius', emoji: '♐' };
      return { sign: 'Unknown', emoji: '❓' };
    };

    const zodiac = getZodiac(day, month);
    let ageText = 'Not specified';
    if (year) {
      const now = new Date();
      let age = now.getFullYear() - year;
      if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age--;
      ageText = `${age} years old`;
    }

    const container = ContainerService.create({
      title: '🎂 Confirm Birthday Setup',
      description: `Are you setting your birthday to **${dateStr}**?\n\n**Current Age:** ${ageText}\n**Zodiac:** ${zodiac.emoji} ${zodiac.sign}`,
      color: '#FFB600',
      footer: true,
      interaction
    });

    const acceptBtn = new ButtonBuilder()
      .setCustomId(`bday_set_accept_${interaction.user.id}_${day}_${month}_${year || 0}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);

    const declineBtn = new ButtonBuilder()
      .setCustomId(`bday_set_decline_${interaction.user.id}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<any>().addComponents(acceptBtn, declineBtn);
    container.components[0].addActionRowComponents(row);

    await replyV2(interaction, container);
  }
};
