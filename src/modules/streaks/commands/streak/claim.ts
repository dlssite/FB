import { flamebornConfig } from '../../../../config/flameborn.config';
import { StreakService } from '../../services/StreakService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  subName: 'claim',
  
  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId || flamebornConfig.bot.tenant.id;
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const lang = ctx?.lang || 'en';

    const result = await StreakService.claimStreak(tenantId, guildId, userId, interaction.member, interaction.channelId);

    if (!result.success) {
      if (result.reason === 'DISABLED') {
        const container = ContainerService.create({
          title: '❌ Streaks Disabled',
          description: 'The streak module is currently disabled for this server.',
          color: '#FF0000',
          interaction
        });
        return await replyV2(interaction, container, true);
      }
      
      if (result.reason === 'COOLDOWN') {
        const remaining = Math.ceil(24 - (result.hoursSince || 0));
        const container = ContainerService.create({
          title: '⏳ Cooldown Active',
          description: `You have already claimed your streak today. Check back in **${remaining} hours**!`,
          color: '#FFA500',
          interaction
        });
        return await replyV2(interaction, container, true);
      }
    }

    let description = '';

    if (result.isFrozen) {
      description += Translator.t('streaks', 'streak.frozen', lang, { streak: result.streak }) + '\n\n';
    } else if (result.streakBroken) {
      description += Translator.t('streaks', 'streak.lost', lang, { lost: result.lost }) + '\n\n';
    } else {
      description += Translator.t('streaks', 'streak.claimed', lang, { streak: result.streak }) + '\n\n';
    }

    description += Translator.t('streaks', 'streak.rewards', lang, { 
      xp: result.rewards?.xp, 
      embers: result.rewards?.embers 
    });

    const container = ContainerService.create({
      title: '🔥 Daily Streak',
      description,
      color: '#FF4500',
      thumbnail: interaction.user.displayAvatarURL(),
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
