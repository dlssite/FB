import { Events, Message, MessageFlags } from 'discord.js';
import { AutoService, AutoTrigger } from '../services/AutoService';
import { tenantStorage } from '../../../utils/context';
import { ContainerService } from '../../../utils/container';
import { RoutingService } from '../../../services/RoutingService';
import { Logger } from '../../../utils/logger';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    // Resolve context for non-commands (Legacy pattern for message listeners)
    const tenantId = await RoutingService.resolveTenantId(message.guild.id, 'auto');
    Logger.debug(`[AUTO] Processing message from ${message.author.tag} in ${message.guild.name}. Tenant: ${tenantId}`, 'ACTION_ENGINE' as any);
    
    await tenantStorage.run({ tenantId, guildId: message.guild.id, lang: 'en' }, async () => {
      // Retrieve cached triggers for this guild
      const triggers = await AutoService.getTriggers(tenantId, message.guild.id);
      if (!triggers.length) return;

      Logger.debug(`[AUTO] Evaluating ${triggers.length} triggers against content: "${message.content}"`, 'ACTION_ENGINE' as any);

      // Find all matching triggers
      const matchedTriggers = triggers.filter(trigger => {
        // Check channel filter
        if (trigger.channels.length > 0 && !trigger.channels.includes(message.channel.id)) {
          Logger.debug(`[AUTO] Trigger "${trigger.name}" SKIPPED — channel filter (allowed: [${trigger.channels.join(',')}], got: ${message.channel.id})`, 'ACTION_ENGINE' as any);
          return false;
        }

        // Check role filter
        if (trigger.roles.length > 0 && message.member) {
          const hasRole = message.member.roles.cache.some(r => trigger.roles.includes(r.id));
          if (!hasRole) {
            Logger.debug(`[AUTO] Trigger "${trigger.name}" SKIPPED — role filter (required: [${trigger.roles.join(',')}])`, 'ACTION_ENGINE' as any);
            return false;
          }
        }

        // Check trigger logic
        const matched = AutoService.isMatch(message.content, trigger);
        if (matched) Logger.debug(`[AUTO] Trigger "${trigger.name}" matched!`, 'ACTION_ENGINE' as any);
        return matched;
      });

      if (!matchedTriggers.length) {
        Logger.debug(`[AUTO] No triggers matched.`, 'ACTION_ENGINE' as any);
        return;
      }

      // Execute matched triggers
      for (const trigger of matchedTriggers) {
        // RNG Chance check
        if (trigger.chance < 100) {
          const roll = Math.random() * 100;
          if (roll > trigger.chance) continue; // Failed the chance roll
        }

        // Cooldown check
        if (AutoService.isOnCooldown(trigger.id, message.author.id, trigger.cooldown)) {
          continue; // User is on cooldown for this specific trigger
        }

        // 1. Process Reactions
        if (trigger.reactions && trigger.reactions.length > 0) {
          for (const emoji of trigger.reactions) {
            try {
              await message.react(emoji);
            } catch (e) {
              // Ignore invalid emojis or permissions errors
            }
          }
        }

        // 2. Process Replies (Multi-Response Roulette)
        let replyContent: string | null = null;
        
        if (trigger.replyTexts && trigger.replyTexts.length > 0) {
          // Pick a random reply from the array
          const randomIndex = Math.floor(Math.random() * trigger.replyTexts.length);
          replyContent = trigger.replyTexts[randomIndex];
        }

        // Only send a reply if there's text or media
        if (replyContent || trigger.replyMedia) {
          if (trigger.useEmbed) {
            const container = ContainerService.create({
              description: replyContent || undefined,
              image: trigger.replyMedia || undefined,
              color: '#7367F0',
              footer: true
            });

            await message.reply({
              ...container,
              flags: MessageFlags.SuppressNotifications // Prevent pinging every time
            }).catch(() => {});
          } else {
            const payload: any = {};
            if (replyContent) payload.content = replyContent;
            if (trigger.replyMedia) payload.files = [trigger.replyMedia];

            await message.reply({
              ...payload,
              flags: MessageFlags.SuppressNotifications
            }).catch(() => {});
          }
        }
      }
    });
  }
};
