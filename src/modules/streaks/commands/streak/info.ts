import { flamebornConfig } from '../../../../config/flameborn.config';
import { StreakRepository } from '../../database/StreakRepository';
import { EconomyRepository } from '../../../economy/database/EconomyRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  subName: 'info',
  
  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId || flamebornConfig.bot.tenant.id;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const lang = ctx?.lang || 'en';

    const user = await StreakRepository.getUser(tenantId, guildId, userId);
    const inventory = await EconomyRepository.getInventory(tenantId, userId);
    const freeze1 = inventory.find(i => i.itemName === 'streak_freeze_1')?.quantity || 0;
    const freeze2 = inventory.find(i => i.itemName === 'streak_freeze_2')?.quantity || 0;
    const freeze3 = inventory.find(i => i.itemName === 'streak_freeze_3')?.quantity || 0;
    const totalFreezes = freeze1 + freeze2 + freeze3;

    let timeUntilNext = 'Ready to claim!';
    if (user.lastClaimedAt) {
      const hoursSince = (Date.now() - new Date(user.lastClaimedAt).getTime()) / 3600000;
      if (hoursSince < 24) {
        timeUntilNext = `${Math.ceil(24 - hoursSince)} hours`;
      } else if (hoursSince > 48) {
        timeUntilNext = 'Streak broken (unless frozen!)';
      }
    }

    const container = ContainerService.create({
      title: Translator.t('streaks', 'streak.info.title', lang),
      description: Translator.t('streaks', 'streak.info.desc', lang),
      color: '#FF4500',
      thumbnail: interaction.user.displayAvatarURL(),
      fields: [
        { name: '🔥 Current Streak', value: `${user.currentStreak} Days` },
        { name: '🏆 Longest Streak', value: `${user.longestStreak} Days` },
        { name: '❄️ Streak Freezes', value: `${totalFreezes} Available` },
        { name: '⏳ Next Claim', value: timeUntilNext }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
