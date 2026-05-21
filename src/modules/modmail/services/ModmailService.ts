import { Client, Message, User, ThreadChannel, TextChannel, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ModmailRepository } from '../database/ModmailRepository';
import { prisma } from '../../../database/client';
import { TriageService } from './TriageService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { RedisService } from '../../../services/RedisService';
import { sendV2, ContainerService } from '../../../utils/container';
import { Logger } from '../../../utils/logger';

export class ModmailService {

  static hexToDecimal(hex: string): number {
    return parseInt(hex.replace('#', ''), 16) || 0x7367F0;
  }

  /**
   * Processes a message from a user in DM
   */
  static async handleIncomingUserMessage(client: Client, user: User, content: string, targetGuildId?: string, forceTenantId?: string): Promise<boolean> {
    Logger.info(`[MODMAIL] handleIncomingUserMessage invoked for user ${user.tag} (${user.id}). Guild: ${targetGuildId}, Tenant: ${forceTenantId}`);
    
    // 1. Mutual Server Resolution (Single Query Lookup)
    let mutualGuilds: any[] = [];
    if (targetGuildId && forceTenantId) {
      mutualGuilds = [{ guildId: targetGuildId, tenantId: forceTenantId }];
    } else {
      // Find mutual servers
      const guilds = Array.from(client.guilds.cache.keys());
      const mutuals = await prisma.modmail_settings.findMany({
        where: {
          guildId: { in: guilds },
          enabled: true
        }
      });
      mutualGuilds = mutuals;
    }

    if (mutualGuilds.length === 0) {
      Logger.error(`[MODMAIL] No mutual guilds found with Modmail enabled for user ${user.id}`);
      return false;
    }

    // Multi-tenant check
    if (mutualGuilds.length > 1 && !targetGuildId) {
      Logger.info(`[MODMAIL] Multiple mutual guilds found for user ${user.id}. Prompting select menu.`);
      // Prompt user to select a server
      const selectMenuBuilder = new ActionRowBuilder<any>();
      const choices = mutualGuilds.map((g: any) => {
        const guildObj = client.guilds.cache.get(g.guildId);
        return {
          label: guildObj ? guildObj.name : `Server [${g.guildId}]`,
          value: `${g.tenantId}_${g.guildId}`
        };
      });

      const selectMenu = {
        type: 3, // StringSelect
        customId: 'modmail_server_select',
        placeholder: 'Select a server to contact support...',
        options: choices
      };
      
      selectMenuBuilder.addComponents(selectMenu);

      const promptPayload = ContainerService.create({
        title: '📬 Flameborn Modmail System',
        description: `You shared mutual servers with Flameborn. Please select which server staff you want to contact.\n\n> *"${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"*`,
        color: flamebornConfig.branding.color,
        components: [selectMenuBuilder],
        footer: true
      });

      const dmChannel = user.dmChannel || await user.createDM().catch(() => null);
      if (dmChannel) {
        await sendV2(dmChannel, promptPayload).catch(() => {});
      }
      return true;
    }

    const { tenantId, guildId } = mutualGuilds[0];
    Logger.info(`[MODMAIL] Routing ticket for user ${user.id} to guild: ${guildId}, tenant: ${tenantId}`);

    const guild = await client.guilds.fetch(guildId).catch((err) => {
      Logger.error(`[MODMAIL] Failed to fetch guild ${guildId}:`, err);
      return null;
    });
    if (!guild) {
      Logger.error(`[MODMAIL] Guild ${guildId} not found or inaccessible by client.`);
      return false;
    }

    // Distributed Redis Lock
    const lockKey = `modmail:lock:${user.id}:${guildId}`;
    const acquired = await RedisService.acquireLock(lockKey, 8).catch((err) => {
      Logger.error(`[MODMAIL] Redis lock error for user ${user.id}:`, err);
      return false;
    });
    if (!acquired) {
      Logger.error(`[MODMAIL] Could not acquire lock ${lockKey} or locked.`);
      return false;
    }

    try {
      let ticket = await ModmailRepository.getActiveTicketByUser(tenantId, guildId, user.id).catch((err) => {
        Logger.error(`[MODMAIL] Failed to query active ticket from DB:`, err);
        throw err;
      });
      
      if (!ticket) {
        Logger.info(`[MODMAIL] No active ticket found. Creating a new ticket.`);
        const settings = await ModmailRepository.getSettings(tenantId, guildId).catch((err) => {
          Logger.error(`[MODMAIL] Failed to query modmail settings from DB:`, err);
          throw err;
        });

        if (!settings) {
          Logger.error(`[MODMAIL] Settings row could not be created or fetched.`);
          await RedisService.del(lockKey);
          return false;
        }

        Logger.info(`[MODMAIL] Retrieved settings: logChannelId = ${settings.logChannelId}, enabled = ${settings.enabled}`);

        if (!settings.enabled) {
          Logger.error(`[MODMAIL] Modmail settings is disabled (enabled = false) for guild ${guildId}.`);
          await RedisService.del(lockKey);
          return false;
        }

        if (!settings.logChannelId) {
          Logger.error(`[MODMAIL] Modmail logChannelId is missing/null in settings for guild ${guildId}.`);
          await RedisService.del(lockKey);
          return false;
        }

        const logChannel = await guild.channels.fetch(settings.logChannelId).catch((err) => {
          Logger.error(`[MODMAIL] Failed to fetch log channel ${settings.logChannelId}:`, err);
          return null;
        }) as TextChannel;
        
        if (!logChannel) {
          Logger.error(`[MODMAIL] Log channel ${settings.logChannelId} could not be resolved or permission denied.`);
          await RedisService.del(lockKey);
          return false;
        }

        // Run AI Triage
        Logger.info(`[MODMAIL] Running AI triage on content...`);
        const triageRes = await TriageService.analyzeMessage(tenantId, guildId, content).catch((err) => {
          Logger.error(`[MODMAIL] TriageService analyzeMessage failed:`, err);
          throw err;
        });
        const triageCategory = triageRes.category;
        Logger.info(`[MODMAIL] Triage complete. Category resolved: ${triageCategory}`);
        
        const categoryConfig = await ModmailRepository.getCategoryByName(tenantId, guildId, triageCategory);
        
        const pingRoleId = categoryConfig ? categoryConfig.pingRoleId : settings.defaultPingRoleId;
        const pingString = pingRoleId ? `<@&${pingRoleId}>` : '';

        // Create Thread
        Logger.info(`[MODMAIL] Creating thread inside log channel ${logChannel.name} (${logChannel.id})...`);
        const thread = await logChannel.threads.create({
          name: `${user.username} - ${triageCategory}`,
          autoArchiveDuration: 1440,
          reason: 'Modmail Ticket Creation',
        }).catch((err) => {
          Logger.error(`[MODMAIL] Thread creation in log channel ${logChannel.id} failed:`, err);
          return null;
        });

        if (!thread) {
          Logger.error(`[MODMAIL] Thread creation returned null.`);
          await RedisService.del(lockKey);
          return false;
        }

        Logger.info(`[MODMAIL] Thread created successfully: ${thread.name} (${thread.id})`);

        // Save ticket in DB
        ticket = await ModmailRepository.createTicket(tenantId, guildId, user.id, triageCategory).catch((err) => {
          Logger.error(`[MODMAIL] Failed to insert ticket into database:`, err);
          throw err;
        });
        await ModmailRepository.updateTicket(tenantId, ticket.id, { threadId: thread.id });

        // Welcome thread V2 Embed
        const replyBtn = new ButtonBuilder().setCustomId(`modmail_reply_btn_${ticket.id}`).setLabel('Reply').setStyle(ButtonStyle.Success);
        const claimBtn = new ButtonBuilder().setCustomId(`modmail_claim_${ticket.id}`).setLabel('Claim Ticket').setStyle(ButtonStyle.Primary);
        const closeBtn = new ButtonBuilder().setCustomId(`modmail_close_${ticket.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(replyBtn, claimBtn, closeBtn);

        const welcomePayload = ContainerService.create({
          title: '📩 New Modmail Ticket',
          description: `User: <@${user.id}> (${user.tag})\nCategory: **${triageCategory.toUpperCase()}**\n\n**Initial Message:**\n${content}`,
          color: '#2ECC71',
          components: [row],
          footer: true
        });

        // Send ping as a separate message to avoid 50035 error on IsComponentsV2 with content
        if (pingString) {
          await thread.send(pingString).catch(() => {});
        }

        await sendV2(thread, welcomePayload).catch((err) => {
          Logger.error(`[MODMAIL] Failed to send V2 welcome message to thread ${thread.id}:`, err);
        });

        // Auto Suggestion to User
        const autoSuggestion = triageRes.suggestion;
        if (autoSuggestion) {
          const suggestPayload = ContainerService.create({
            title: '💡 Smart Suggestion',
            description: autoSuggestion,
            color: '#FFD700',
            footer: true
          });
          const userDm = user.dmChannel || await user.createDM().catch(() => null);
          if (userDm) {
            await sendV2(userDm, suggestPayload).catch(() => {});
          }
        }
      } else {
        // Forward Message to Thread
        const activeTicket = ticket!;
        Logger.info(`[MODMAIL] Existing ticket found (ID: ${activeTicket.id}). Forwarding message to thread.`);
        const thread = await guild.channels.fetch(activeTicket.threadId!).catch((err) => {
          Logger.error(`[MODMAIL] Failed to fetch thread channel ${activeTicket.threadId}:`, err);
          return null;
        }) as ThreadChannel | null;

        if (thread) {
          const replyBtn = new ButtonBuilder().setCustomId(`modmail_reply_btn_${activeTicket.id}`).setLabel('Reply').setStyle(ButtonStyle.Success);
          const claimBtn = new ButtonBuilder().setCustomId(`modmail_claim_${activeTicket.id}`).setLabel('Claim Ticket').setStyle(ButtonStyle.Primary);
          const closeBtn = new ButtonBuilder().setCustomId(`modmail_close_${activeTicket.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger);
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(replyBtn, claimBtn, closeBtn);

          const msgPayload = ContainerService.create({
            title: `Message from ${user.username}`,
            description: content,
            color: '#FFFFFF',
            components: [row],
            footer: true
          });

          // Clean up old buttons
          if (activeTicket.lastThreadMessageId) {
            const oldMsg = await thread.messages.fetch(activeTicket.lastThreadMessageId).catch(() => null);
            if (oldMsg) await oldMsg.edit({ components: [] }).catch(() => {});
          }

          const newMsg = await sendV2(thread, msgPayload).catch((err) => {
            Logger.error(`[MODMAIL] Failed to send V2 forwarded message to thread ${thread.id}:`, err);
            return null;
          }) as any;

          if (newMsg) {
            await ModmailRepository.updateTicket(tenantId, activeTicket.id, { lastThreadMessageId: newMsg.id });
          }
          
          // Save to transcript
          await ModmailRepository.addMessage(tenantId, activeTicket.id, user.id, content, false);
        } else {
          Logger.error(`[MODMAIL] Active ticket is saved in DB, but thread ${activeTicket.threadId} could not be resolved! Closing invalid ticket and re-trying...`);
          await ModmailRepository.updateTicket(tenantId, activeTicket.id, { status: 'closed', closedAt: new Date() }).catch(() => {});
          await RedisService.del(lockKey).catch(() => {});
          return await ModmailService.handleIncomingUserMessage(client, user, content, targetGuildId, forceTenantId);
        }
      }
    } catch (err: any) {
      Logger.error(`[MODMAIL] Unexpected error in handleIncomingUserMessage workflow:`, err);
      return false;
    } finally {
      await RedisService.del(lockKey);
    }

    return true;
  }

  /**
   * Handles an outgoing message from a moderator to a user
   */
  static async handleOutgoingModMessage(client: Client, ticket: any, moderator: User, content: string, maskedIdentity: string | null) {
    const user = await client.users.fetch(ticket.userId).catch(() => null);
    if (!user) return false;

    const identityStr = maskedIdentity ? maskedIdentity : moderator.username;

    // Send to User DM
    const closeBtn = new ButtonBuilder().setCustomId(`modmail_close_${ticket.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeBtn);

    const userPayload = ContainerService.create({
      title: `Message from ${identityStr}`,
      description: content,
      color: flamebornConfig.branding.color,
      components: [row],
      footer: true
    });

    // Clean up old buttons
    if (ticket.lastUserMessageId) {
      const dmChannel = user.dmChannel || await user.createDM().catch(() => null);
      if (dmChannel) {
        const oldMsg = await dmChannel.messages.fetch(ticket.lastUserMessageId).catch(() => null);
        if (oldMsg) await oldMsg.edit({ components: [] }).catch(() => {});
      }
    }

    let newMsg = null;
    const dmChannel = user.dmChannel || await user.createDM().catch(() => null);
    if (dmChannel) {
      newMsg = await sendV2(dmChannel, userPayload).catch(() => null) as any;
    }
    
    if (newMsg) {
      await ModmailRepository.updateTicket(ticket.tenantId, ticket.id, { lastUserMessageId: newMsg.id });
    }

    // Save to transcript
    await ModmailRepository.addMessage(ticket.tenantId, ticket.id, moderator.id, content, false, maskedIdentity || undefined);

    // Confirm in Thread
    const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
    if (guild) {
       const settings = await ModmailRepository.getSettings(ticket.tenantId, ticket.guildId);
       if (settings && settings.logChannelId) {
          const logChannel = await guild.channels.fetch(settings.logChannelId).catch(() => null) as TextChannel;
          if (logChannel) {
             const thread = await guild.channels.fetch(ticket.threadId).catch(() => null) as ThreadChannel | null;
             if (thread) {
                // Remove old thread buttons
                if (ticket.lastThreadMessageId) {
                   const oldMsg = await thread.messages.fetch(ticket.lastThreadMessageId).catch(() => null);
                   if (oldMsg) await oldMsg.edit({ components: [] }).catch(() => {});
                }

                const replyBtn = new ButtonBuilder().setCustomId(`modmail_reply_btn_${ticket.id}`).setLabel('Reply').setStyle(ButtonStyle.Success);
                const claimBtn = new ButtonBuilder().setCustomId(`modmail_claim_${ticket.id}`).setLabel('Claim Ticket').setStyle(ButtonStyle.Primary);
                const closeBtnThread = new ButtonBuilder().setCustomId(`modmail_close_${ticket.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger);
                const threadRow = new ActionRowBuilder<ButtonBuilder>().addComponents(replyBtn, claimBtn, closeBtnThread);

                const echoPayload = ContainerService.create({
                  title: `Reply sent by ${identityStr}`,
                  description: content,
                  color: '#0000FF',
                  components: [threadRow],
                  footer: true
                });

                const newThreadMsg = await sendV2(thread, echoPayload).catch(() => null) as any;
                if (newThreadMsg) {
                   await ModmailRepository.updateTicket(ticket.tenantId, ticket.id, { lastThreadMessageId: newThreadMsg.id });
                }
             }
          }
       }
    }

    return true;
  }

  /**
   * Triggers the CSAT rating flow when a ticket is closed
   */
  static async sendCSATPrompt(client: Client, ticket: any) {
    const user = await client.users.fetch(ticket.userId).catch(() => null);
    if (!user) return;

    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let i = 1; i <= 5; i++) {
      row.addComponents(
        new ButtonBuilder().setCustomId(`modmail_csat_${ticket.id}_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Secondary)
      );
    }

    const csatPayload = ContainerService.create({
      title: '🔒 Ticket Closed',
      description: 'Your support ticket has been closed. How would you rate the support you received?',
      color: '#FF0000',
      components: [row],
      footer: true
    });

    const dmChannel = user.dmChannel || await user.createDM().catch(() => null);
    if (dmChannel) {
      await sendV2(dmChannel, csatPayload).catch(() => {});
    }
  }
}
