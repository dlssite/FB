import { Interaction, MessageFlags, Events } from 'discord.js';
import { GiveawayRepository } from '../database/GiveawayRepository';
import { GiveawayService } from '../services/GiveawayService';
import { RedisService } from '../../../services/RedisService';
import { tenantStorage } from '../../../utils/context';
import { Translator } from '../../../core/Translator';
import { ContainerService, replyV2 } from '../../../utils/container';

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    // ── Handle Buttons (Join Giveaway) ──────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('giveaway_join_')) {
      // Defer IMMEDIATELY to beat 3s window
      await interaction.deferUpdate().catch(() => {});

      const guildId = interaction.guildId;
      if (!guildId) return;

      const { RoutingService } = await import('../../../services/RoutingService');
      const { AddonService } = await import('../../../services/AddonService');
      const tenantId = await RoutingService.resolveTenantId(guildId, 'giveaway');
      
      // Gatekeeper Check: Is Giveaway enabled?
      const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'giveaway');
      if (!isEnabled) return;

      await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
        const messageId = interaction.message.id;
        const lockKey = `lock:giveaway_join:${messageId}`;

        // Distributed lock — prevents race conditions during simultaneous clicks
        const lock = await RedisService.acquireLock(lockKey, 5);
        if (!lock) return;

        try {
          // Cache-aside giveaway lookup (Redis first, DB fallback)
          let giveaway = await GiveawayRepository.getGiveaway(tenantId, messageId);

          // Retry loop for race condition between message send and DB create
          if (!giveaway) {
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 300));
              giveaway = await GiveawayRepository.getGiveaway(tenantId, messageId);
              if (giveaway) break;
            }
          }

          if (!giveaway || giveaway.ended) {
            const msg = Translator.t('giveaway', 'error_ended', 'en');
            return await replyV2(interaction as any, ContainerService.simple(msg), true);
          }

          // Requirements check
          if (giveaway.requirements && Object.keys(giveaway.requirements).length > 0) {
            const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
            if (member) {
              const reqCheck = await GiveawayService.validateRequirements(tenantId, guildId, member, giveaway.requirements);
              if (!reqCheck.passed) {
                return await replyV2(interaction as any, ContainerService.simple(reqCheck.reason || 'You do not meet the requirements.'), true);
              }
            }
          }

          // ── All entry ops are now O(1) Redis calls ──────────────────────────────
          const hasEntered = await GiveawayRepository.hasEntered(giveaway.id, interaction.user.id);
          let participantCount = await GiveawayRepository.getEntryCount(giveaway.id);

          if (giveaway.drop) {
            if (hasEntered) {
              return await interaction.followUp({ content: 'You already claimed this drop!', flags: [MessageFlags.Ephemeral] });
            }

            if (participantCount >= giveaway.winners) {
              const msg = Translator.t('giveaway', 'drop_full', 'en');
              return await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] });
            }

            await GiveawayRepository.addEntry(giveaway.id, interaction.user.id);
            participantCount++;

            const msg = Translator.t('giveaway', 'drop_claimed', 'en');
            await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] });

            if (participantCount >= giveaway.winners) {
              // All slots claimed — end the drop
              await GiveawayService.endGiveaway(interaction.client, tenantId, messageId, giveaway);
            } else {
              const builder = GiveawayService.buildGiveawayContainer(giveaway, messageId, participantCount, false);
              await interaction.message.edit({ components: [builder], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            }

          } else {
            if (hasEntered) {
              await GiveawayRepository.removeEntry(giveaway.id, interaction.user.id);
              participantCount--;
              const msg = Translator.t('giveaway', 'join_removed', 'en');
              await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] });
            } else {
              await GiveawayRepository.addEntry(giveaway.id, interaction.user.id);
              participantCount++;
              const msg = Translator.t('giveaway', 'join_success', 'en');
              await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] });
            }

            const builder = GiveawayService.buildGiveawayContainer(giveaway, messageId, participantCount, false);
            await interaction.message.edit({ components: [builder], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
          }

        } finally {
          await RedisService.releaseLock(lockKey);
        }
      });
    }

    // ── Handle Dropdowns (End, Cancel, Reroll) ─────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('giveaway_action_')) {
      await interaction.deferUpdate().catch(() => {});

      const guildId = interaction.guildId;
      if (!guildId) return;

      const { RoutingService } = await import('../../../services/RoutingService');
      const tenantId = await RoutingService.resolveTenantId(guildId, 'giveaway');

      await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
        const action = interaction.customId.replace('giveaway_action_', '');
        const messageId = interaction.values[0];

        let result: { success: boolean; error?: string };

        if (action === 'end') {
          result = await GiveawayService.executeEnd(interaction.client, tenantId, messageId, interaction.user.id);
        } else if (action === 'cancel') {
          result = await GiveawayService.executeCancel(interaction.client, tenantId, messageId);
        } else if (action === 'reroll') {
          result = await GiveawayService.executeReroll(interaction.client, tenantId, messageId);
        } else {
          return;
        }

        if (!result.success) {
          const errMsg = Translator.t('giveaway', result.error || 'error_not_found', 'en');
          await interaction.followUp({
            content: `❌ ${errMsg}`,
            flags: MessageFlags.Ephemeral
          }).catch(() => {});
          return;
        }

        // Successfully executed the action. Now replace the dropdown in the selection message so it cannot be reused.
        const successMsg = action === 'end' 
          ? 'end_success' 
          : action === 'cancel' 
            ? 'cancel_success' 
            : 'reroll_success';

        const localizedMsg = Translator.t('giveaway', successMsg, 'en');

        await interaction.editReply({
          content: undefined,
          components: [
            ContainerService.simple(`✅ ${localizedMsg}`).components[0]
          ],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      });
    }
  }
};
