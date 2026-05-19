import { Events, Message, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { AiService } from '../services/AiService';
import { AiMiddleware } from '../middleware/AiMiddleware';
import { tenantStorage } from '../../../utils/context';
import { AiRepository } from '../database/AiRepository';
import { Logger } from '../../../utils/logger';
import { ContainerService, sendV2 } from '../../../utils/container';
import { RedisService } from '../../../services/RedisService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guildId) return;

    const tenantId = await RoutingService.resolveTenantId(message.guildId, 'ai');
    const guildId = message.guildId;

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
        await message.channel.sendTyping();
        typingInterval = setInterval(() => message.channel.sendTyping(), 8000);

        const highestRoleName = message.member?.roles.highest.name || 'Member';
        const isAdmin = message.member?.permissions.has('Administrator') || false;

        const response = await AiService.generateResponse(
          tenantId,
          guildId,
          message.channelId,
          message.author.id,
          message.content,
          isMention,
          message.member,
          {
            roleName: highestRoleName,
            isAdmin,
            displayName: message.member?.displayName || message.author.username,
            guildName: message.guild?.name || 'the realm'
          }
        );

        let finalReplyText = response.text?.trim() || '';

        // Append low-risk action results inline
        if (response.actionResult?.executed) {
          finalReplyText += `\n\n${response.actionResult.result}`;
        }

        // Fallback text guards
        if (!finalReplyText && response.actionResult) {
          finalReplyText = 'Action processed.';
        } else if (!finalReplyText) {
          finalReplyText = '...';
        }

        // ── High/Medium risk: show confirmation buttons ───────────────────
        if (response.actionResult?.requiresConfirmation) {
          const confirmId = Math.random().toString(36).substring(2, 15);
          const redisKey = `ai:confirm:${confirmId}`;

          await RedisService.set(redisKey, JSON.stringify({
            action: response.actionResult.action,
            parameters: response.actionResult.parameters,
            userId: message.author.id,
            guildId,
            tenantId
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
          // ── Normal conversational reply ─────────────────────────────────
          if (finalReplyText && finalReplyText !== '...') {
            await message.reply({ content: finalReplyText });
          }
        }

      } catch (err) {
        Logger.error('[AI] Processing error in messageCreate', err);
      } finally {
        if (typingInterval) clearInterval(typingInterval);
        await AiMiddleware.releaseLock(message.channelId);
      }
    });
  }
};
