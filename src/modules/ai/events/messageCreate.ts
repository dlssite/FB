import { Events, Message, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { AiService } from '../services/AiService';
import { AiMiddleware } from '../middleware/AiMiddleware';
import { tenantStorage } from '../../../utils/context';
import { AiRepository } from '../database/AiRepository';
import { Logger } from '../../../utils/logger';
import { ContainerService, sendV2 } from '../../../utils/container';
import { RedisService } from '../../../services/RedisService';
import { RoutingService } from '../../../services/RoutingService';
import { ProfileRepository } from '../../profile/database/ProfileRepository';
import { AddonService } from '../../../services/AddonService';
import shopBrowse from '../../shop/commands/shop/browse';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guildId) return;

    const tenantId = await RoutingService.resolveTenantId(message.guildId, 'ai');
    const guildId = message.guildId;

    // Gatekeeper Check: Is AI enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'ai');
    if (!isEnabled) return;

    await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
      const context = tenantStorage.getStore();
      if (!context) return;

      // Check if AI is enabled and channel is bound
      const settings = await AiRepository.getSettings(guildId, tenantId);
      if (!settings?.enabled) return;

      const isMention = message.mentions.has(message.client.user!.id);
      const boundChannels = (settings.boundChannels as string[]) || [];
      const isBoundChannel = boundChannels.includes(message.channelId);

      // Only respond to direct mentions in bound channels
      if (!isMention || !isBoundChannel) return;

      // Prevent duplicate concurrent responses via distributed lock
      const locked = await AiMiddleware.acquireLock(message.channelId);
      if (!locked) return;

      // Refresh typing indicator every 8s — AI can take up to 20s to respond
      let typingInterval: NodeJS.Timeout | null = null;

      try {
        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping();
          typingInterval = setInterval(() => {
            if ('sendTyping' in message.channel) {
              message.channel.sendTyping().catch(() => {});
            }
          }, 8000);
        }

        // Extract second-highest role (skip @everyone)
        const allRoles = message.member?.roles.cache
          .filter(r => r.name !== '@everyone')
          .sort((a, b) => b.position - a.position) || [];
        
        const highestRoleName = allRoles.at(0)?.name || 'Member';
        const secondHighestRoleName = allRoles.at(1)?.name || highestRoleName;
        
        const isAdmin = message.member?.permissions.has('Administrator') || false;
        
        // Fetch admin title from profile
        const profile = await ProfileRepository.getProfile(tenantId, message.author.id).catch(() => null);

        const response = await AiService.generateResponse(
          tenantId,
          guildId,
          message.channelId,
          message.author.id,
          message.content,
          isMention,
          message.member,
          {
            roleName: secondHighestRoleName,
            highestRoleName: highestRoleName,
            isAdmin,
            displayName: message.member?.displayName || message.author.username,
            guildName: message.guild?.name || 'the realm',
            adminTitle: profile?.adminTitle || undefined,
            secondHighestRole: secondHighestRoleName
          },
          message  // Pass full message object for tools that need channel context
        );

        let finalReplyText = response.text?.trim() || '';

        Logger.debug(`[AI] Response handling: text="${finalReplyText?.substring(0, 50) || 'empty'}...", actionExecuted=${response.actionResult?.executed}`);

        // Append low-risk action results inline
        if (response.actionResult?.executed && response.actionResult?.result) {
          finalReplyText += `\n\n${response.actionResult.result}`;
          Logger.debug(`[AI] Appended action result to reply`);
        }

        // Smart response guards - no empty or placeholder text
        if (!finalReplyText) {
          if (response.actionResult?.executed) {
            // Action succeeded but no text response - use smart fallback
            finalReplyText = '✅ Action completed successfully.';
            Logger.debug(`[AI] Using action-success fallback`);
          } else if (response.actionResult?.result) {
            finalReplyText = response.actionResult.result;
            Logger.debug(`[AI] Using action-result fallback`);
          } else {
            finalReplyText = '✨ Done.';
            Logger.debug(`[AI] Using generic done fallback`);
          }
        }

        Logger.debug(`[AI] Final reply text: "${finalReplyText?.substring(0, 100) || 'empty'}..."`);

        // ── High/Medium risk: show confirmation buttons ───────────────────
        if (response.actionResult?.requiresConfirmation) {
          Logger.info(`[AI] Showing confirmation for action: ${response.actionResult.action}`);
          const confirmId = Math.random().toString(36).substring(2, 15);
          const redisKey = `ai:confirm:${confirmId}`;

          await RedisService.set(redisKey, JSON.stringify({
            action: response.actionResult.action,
            parameters: response.actionResult.parameters,
            userId: message.author.id,
            guildId,
            tenantId,
            isAdmin,
            displayName: message.member?.displayName || message.author.username
          }), 300);

          const confirmButton = new ButtonBuilder()
            .setCustomId(`ai_confirm_${confirmId}`)
            .setLabel('Confirm Action')
            .setStyle(ButtonStyle.Danger);

          const cancelButton = new ButtonBuilder()
            .setCustomId(`ai_cancel_${confirmId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

          const containerPayload = ContainerService.create({
            title: 'Cognitive Engine: Confirmation Required',
            description: `${finalReplyText}\n\n⚠️ **${response.actionResult.message}**`,
            color: response.actionResult.risk === 'HIGH' ? '#FF0000' : '#FFA500',
            components: [row],
            footer: true,
            interaction: { client: message.client }
          });

          await sendV2(message.channel, containerPayload);

        } else {
          // ── Smart Shop Detection Fallback ──────────────────────────────
          // If user asked about shop but AI didn't call a tool, show shop embed as fallback
          const userMessageLower = message.content.toLowerCase();
          const shopKeywords = ['shop', 'browse', 'items in', 'what can i buy', 'what\'s for sale', 'marketplace', 'catalog', 'shopping'];
          const isShopQuery = shopKeywords.some(kw => userMessageLower.includes(kw));
          const noToolWasCalled = !response.actionResult;
          
          if (isShopQuery && noToolWasCalled) {
            Logger.info(`[AI] Shop query detected without tool call - triggering shop UI fallback`);
            
            // Send AI's response first
            if (finalReplyText) {
              await message.reply({ content: finalReplyText });
            }
            
            // Then show the interactive shop
            try {
              const pseudoInteraction = {
                guildId: message.guildId,
                user: message.author,
                member: message.member,
                channelId: message.channelId,
                channel: message.channel,
                reply: (payload: any) => {
                  // Use sendV2 for proper type safety
                  return sendV2(message.channel as any, payload);
                },
                options: {
                  getString: () => null // No category pre-selected
                }
              };
              
              await shopBrowse.execute(pseudoInteraction);
              Logger.info(`[AI] Shop browse UI shown as fallback`);
            } catch (shopErr) {
              const shopErrMsg = shopErr instanceof Error ? shopErr.message : String(shopErr);
              Logger.debug(`[AI] Shop UI fallback failed: ${shopErrMsg}`);
            }
          } else {
            // ── Normal conversational reply ─────────────────────────────────
            if (finalReplyText) {
              await message.reply({ content: finalReplyText });
            }
          }
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        Logger.error(`[AI] Processing error in messageCreate: ${errorMsg}`, err);
        
        // Attempt to send error response if possible
        try {
          if (message && message.reply && typeof message.reply === 'function') {
            await message.reply({ 
              content: '⚠️ I encountered an error processing your request. Please try again.',
              allowedMentions: { repliedUser: false }
            });
            Logger.info(`[AI] Sent error response to user`);
          } else {
            Logger.warn(`[AI] Cannot send error reply - message object invalid or reply method unavailable`);
          }
        } catch (replyErr) {
          const replyErrMsg = replyErr instanceof Error ? replyErr.message : String(replyErr);
          Logger.error(`[AI] Failed to send error reply: ${replyErrMsg}`);
        }
      } finally {
        if (typingInterval) clearInterval(typingInterval);
        await AiMiddleware.releaseLock(message.channelId);
      }
    });
  }
};
