import { Events, GuildMember } from 'discord.js';
import { BoosterService } from '../services/BoosterService';
import { BoosterRepository } from '../database/BoosterRepository';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';
import { ContainerService } from '../../../utils/container';
import { Logger } from '../../../utils/logger';

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.user.bot) return;

    const tenantId = await RoutingService.resolveTenantId(newMember.guild.id, 'booster');
    
    // Gatekeeper Check: Is Booster enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, newMember.guild.id, 'booster');
    if (!isEnabled) return;
    
    // Check if user started boosting
    if (!oldMember.premiumSince && newMember.premiumSince) {
      Logger.tenant(tenantId, `[Booster] ${newMember.user.tag} started boosting ${newMember.guild.name}.`);
      
      const settings = await BoosterRepository.getSettings(tenantId, newMember.guild.id);
      if (settings?.boosterChannelId) {
        const channel = newMember.guild.channels.cache.get(settings.boosterChannelId) as any;
        if (channel && channel.send) {
          const container = ContainerService.create({
            title: `🚀 Server Boost Detected!`,
            description: `**Thank you <@${newMember.id}> for boosting the server!**\n\nYou've unlocked the **Tier 1 Supporter** perks!\n- 1.5x Economy Payouts\n- 1.2x Leveling XP\n\n*Boost 2x to unlock the Tier 2 Custom Identity Engine!*`,
            color: '#FF73FA',
            thumbnail: newMember.user.displayAvatarURL(),
            image: 'https://placehold.co/800x300/1e1e2e/ff73fa.png?text=BOOSTER+DETECTED', // Beautiful placeholder
            footer: true,
            fields: [
              { name: 'Current Tier', value: 'Level 1 Supporter', inline: true },
              { name: 'Server Boosts', value: `${newMember.guild.premiumSubscriptionCount} Boosts`, inline: true }
            ]
          });
          await channel.send(container);
        }
      }
      
      // Clear grace period if they were unboosted recently
      await BoosterService.evaluateGracePeriod(tenantId, newMember.guild, newMember);
    }
    
    // Check if user stopped boosting
    if (oldMember.premiumSince && !newMember.premiumSince) {
      Logger.tenant(tenantId, `[Booster] ${newMember.user.tag} stopped boosting ${newMember.guild.name}. Triggering evaluation.`);
      await BoosterService.evaluateGracePeriod(tenantId, newMember.guild, newMember);
    }
  }
};
