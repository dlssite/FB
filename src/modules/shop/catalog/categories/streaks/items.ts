import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

abstract class StreakItem extends BaseItem {
  category = 'streaks';
}

class MinorFreeze extends StreakItem {
  id = 'streak_freeze_1';
  name = 'Minor Streak Freeze';
  description = 'Automatically consumed if you miss your streak claim by up to 24 hours, preventing your streak from resetting.';
  basePrice = 500;
  rarity: Rarity = 'common';
  emoji = '❄️';
}

class MajorFreeze extends StreakItem {
  id = 'streak_freeze_2';
  name = 'Major Streak Freeze';
  description = 'Automatically consumed if you miss your streak claim by up to 48 hours, preventing your streak from resetting.';
  basePrice = 1500;
  rarity: Rarity = 'rare';
  emoji = '🧊';
}

class AbsoluteFreeze extends StreakItem {
  id = 'streak_freeze_3';
  name = 'Absolute Streak Freeze';
  description = 'Automatically consumed if you miss your streak claim by up to 72 hours, preventing your streak from resetting.';
  basePrice = 4500;
  rarity: Rarity = 'epic';
  emoji = '🏔️';
}

class XpCatalyst extends StreakItem {
  id = 'streak_xp_boost';
  name = 'Streak XP Catalyst';
  description = 'Automatically consumed when claiming your streak. Doubles the XP rewarded for that day.';
  basePrice = 750;
  rarity: Rarity = 'uncommon';
  emoji = '🧪';
}

class EmberCatalyst extends StreakItem {
  id = 'streak_ember_boost';
  name = 'Streak Ember Catalyst';
  description = 'Automatically consumed when claiming your streak. Doubles the Embers rewarded for that day.';
  basePrice = 750;
  rarity: Rarity = 'uncommon';
  emoji = '🔥';
}

class LeapToken extends StreakItem {
  id = 'streak_multiplier_token';
  name = 'Streak Leap Token';
  description = 'Automatically consumed when claiming your streak. Artificially adds +10 to your streak tier for the multiplier calculation, massively increasing your rewards.';
  basePrice = 2500;
  rarity: Rarity = 'rare';
  emoji = '🚀';
}

class PhoenixAsh extends StreakItem {
  id = 'streak_restorer';
  name = 'Phoenix Ash';
  description = 'A mythical substance that can resurrect a broken streak. Use this from your inventory to restore your current streak back to your all-time longest streak.';
  basePrice = 50000;
  rarity: Rarity = 'legendary';
  emoji = '✨';

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { StreakRepository } = await import('../../../../streaks/database/StreakRepository');
    const { EconomyRepository } = await import('../../../../economy/database/EconomyRepository');

    const user = await StreakRepository.getUser(tenantId, guildId, userId);

    if (user.currentStreak > 0) {
      await replyV2(interaction, ContainerService.simple('❌ Your streak is not broken. You cannot use this item yet.'), true);
      return;
    }

    if (user.longestStreak === 0) {
      await replyV2(interaction, ContainerService.simple('❌ You have no previous streak to restore.'), true);
      return;
    }

    // Restore Streak
    await StreakRepository.updateStreak(tenantId, guildId, userId, {
      currentStreak: user.longestStreak,
      lastClaimedAt: new Date() // Treat as claimed today
    });

    // Deduct from inventory
    await EconomyRepository.updateItemQuantity(tenantId, userId, this.id, -1);

    await replyV2(interaction, ContainerService.create({
      title: '✨ Phoenix Ash Consumed',
      description: `Your streak has been resurrected from the ashes! You are back on a **${user.longestStreak}** day streak.`,
      color: '#FF4500',
      interaction
    }), true);
  }
}

class TemporalRewind extends StreakItem {
  id = 'temporal_rewind';
  name = 'Temporal Rewind';
  description = 'Automatically consumed in the counting channel if you make a mistake, preventing the count from resetting to zero.';
  basePrice = 1000;
  rarity: Rarity = 'rare';
  emoji = '⏳';
}

export default [
  new MinorFreeze(),
  new MajorFreeze(),
  new AbsoluteFreeze(),
  new XpCatalyst(),
  new EmberCatalyst(),
  new LeapToken(),
  new PhoenixAsh(),
  new TemporalRewind()
];
