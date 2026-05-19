import { flamebornConfig } from '../../../../config/flameborn.config';
import { StreakRepository } from '../../database/StreakRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  subName: 'leaderboard',
  
  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId || flamebornConfig.bot.tenant.id;
    const guildId = interaction.guildId;
    const lang = ctx?.lang || 'en';

    const topStreakers = await StreakRepository.getTopStreaks(tenantId, guildId, 10);

    const fields = topStreakers.map((u, i) => {
      let emoji = '🔥';
      if (i === 0) emoji = '👑';
      else if (i === 1) emoji = '🥈';
      else if (i === 2) emoji = '🥉';
      
      return { 
        name: `${emoji} #${i + 1} — ${u.currentStreak} Days`, 
        value: `<@${u.userId}> (Longest: ${u.longestStreak})`
      };
    });

    if (fields.length === 0) {
      fields.push({ name: 'No Streaks Yet', value: 'Be the first to claim a streak using `/streak claim`!' });
    }

    const container = ContainerService.create({
      title: Translator.t('streaks', 'streak.leaderboard.title', lang),
      description: Translator.t('streaks', 'streak.leaderboard.desc', lang),
      color: '#FF4500',
      fields,
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
