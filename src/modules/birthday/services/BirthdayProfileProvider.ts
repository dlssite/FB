import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { prisma } from '../../../database/client';
import { BirthdayService } from './BirthdayService';

export class BirthdayProfileProvider implements ProfileProvider {
  moduleName = 'birthday';
  priority = 50; // Appears after faction

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [];

    const record = await prisma.user_birthdays.findUnique({
      where: {
        guildId_userId_tenantId: { guildId, userId, tenantId }
      }
    });

    if (!record) return [
      {
        name: '🎂 Astrological & Birth Record',
        value: '**Birthday:** *Unknown*\n**Zodiac:** *Celestial Mystery*\n**Celebration Streak:** *0 years*',
        inline: true
      }
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const age = record.year ? currentYear - record.year : null;
    const zodiac = BirthdayService.getZodiac(record.day, record.month);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const birthDateStr = `${monthNames[record.month - 1]} ${record.day}${record.year ? `, ${record.year}` : ''}`;

    return [
      {
        name: '🎂 Astrological & Birth Record',
        value: `**Birthday:** \`${birthDateStr}\`${age ? ` (Age: \`${age}\`)` : ''}\n**Zodiac:** \`${zodiac}\`\n**Celebration Streak:** \`${record.streakCount} years\``,
        inline: true
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const record = await prisma.user_birthdays.findUnique({
      where: {
        guildId_userId_tenantId: { guildId, userId, tenantId }
      }
    });

    if (!record) return { hasBirthday: false };

    const now = new Date();
    const currentYear = now.getFullYear();
    const age = record.year ? currentYear - record.year : null;

    return {
      hasBirthday: true,
      day: record.day,
      month: record.month,
      year: record.year,
      age,
      zodiac: BirthdayService.getZodiac(record.day, record.month),
      streakCount: record.streakCount
    };
  }
}
