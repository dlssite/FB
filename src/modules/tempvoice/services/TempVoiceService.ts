import { prisma } from '../../../database/client';
import { Logger } from '../../../utils/logger';
import { EconomyRepository } from '../../economy/database/EconomyRepository';
import { SocialService } from '../../social/services/SocialService';
import { ChannelType, PermissionsBitField, VoiceState, GuildMember, VoiceChannel, CategoryChannel } from 'discord.js';

export class TempVoiceService {
  /**
   * Handles a user joining a voice channel.
   * Checks if it's a trigger channel, deducts embers if necessary, creates the channel, and moves the user.
   */
  static async handleUserJoin(tenantId: string, member: GuildMember, newState: VoiceState) {
    if (!newState.channelId) return;

    // 1. Check if the joined channel is a trigger channel
    const hub = await prisma.tempvoice_hubs.findFirst({
      where: {
        tenantId,
        guildId: member.guild.id,
        triggerChannelId: newState.channelId
      }
    });

    if (!hub) return;

    // 2. Check if user already owns an active session in this guild to prevent spam
    const existingSession = await prisma.tempvoice_sessions.findFirst({
      where: {
        tenantId,
        guildId: member.guild.id,
        ownerId: member.id,
        status: 'active'
      }
    });

    if (existingSession) {
      try {
        const existingChannel = await member.guild.channels.fetch(existingSession.channelId).catch(() => null);
        if (existingChannel && existingChannel.isVoiceBased()) {
          // User already has an active channel. Move them to their existing channel.
          await member.voice.setChannel(existingChannel).catch(() => {});
          return;
        } else {
          // Ghost session. Channel was deleted while bot was offline. Delete session and proceed.
          await prisma.tempvoice_sessions.delete({ where: { channelId: existingSession.channelId } }).catch(() => {});
        }
      } catch (err) {
        // Fallback cleanup
        await prisma.tempvoice_sessions.delete({ where: { channelId: existingSession.channelId } }).catch(() => {});
      }
    }

    // 3. Economy Integration: Check and deduct Embers cost
    if (hub.creationCost > 0) {
      const userEco = await EconomyRepository.getUser(tenantId, member.id);
      const balance = Number(userEco?.embers || 0);

      if (balance < hub.creationCost) {
        // Notify user via DM before disconnecting
        try {
          await member.send(`❌ **Insufficient Funds!**\nYou need at least **${hub.creationCost} Embers** to create a temporary voice channel in the **${hub.hubName}** hub. Your current balance is **${balance} Embers**.`);
        } catch (err) {
          Logger.warn(`Could not DM user ${member.id} about insufficient funds.`);
        }

        // Disconnect user
        try {
          await member.voice.disconnect(`Insufficient Embers. Cost: ${hub.creationCost}`);
        } catch (err) { }
        return;
      }

      // Deduct embers
      await EconomyRepository.updateBalance(tenantId, member.id, { embers: -hub.creationCost });
      Logger.info(`Deducted ${hub.creationCost} embers from ${member.id} for tempvoice creation.`);
    }

    // 4. Fetch User Profile
    let profile = await prisma.tempvoice_profiles.findUnique({
      where: {
        userId_tenantId: {
          userId: member.id,
          tenantId
        }
      }
    });

    if (!profile) {
      profile = await prisma.tempvoice_profiles.create({
        data: {
          userId: member.id,
          tenantId,
          preferredName: `${member.displayName}'s Room`,
          preferredLimit: hub.defaultLimit
        }
      });
    }

    // 5. Create the Voice Channel
    try {
      const channelName = profile.preferredName || `${member.displayName}'s Room`;
      const bitrate = hub.defaultBitrate > member.guild.maximumBitrate ? member.guild.maximumBitrate : hub.defaultBitrate;

      let parentId: string | undefined = hub.categoryId;
      const category = await member.guild.channels.fetch(hub.categoryId).catch(() => null);
      if (!category) {
        parentId = undefined;
      }

      const newChannel = await member.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        ...(parentId && { parent: parentId }),
        bitrate: bitrate,
        userLimit: profile.preferredLimit,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
            ],
          },
          {
            id: member.guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
            // Initially unlocked, or locked based on profile.
            ...(profile.autoLock ? { deny: [PermissionsBitField.Flags.Connect] } : { allow: [PermissionsBitField.Flags.Connect] })
          },
          {
            id: member.client.user.id,
            allow: [
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.Speak,
            ],
          },
        ]
      });

      // 6. Social Engine Integration: Auto-allow Friends/Family if locked
      if (profile.autoLock) {
        await this.applySocialBypass(tenantId, member.guild.id, member.id, newChannel);
      }

      // Move user to the new channel
      await member.voice.setChannel(newChannel);

      // 7. Save Session
      await prisma.tempvoice_sessions.create({
        data: {
          channelId: newChannel.id,
          tenantId,
          guildId: member.guild.id,
          hubId: hub.id,
          ownerId: member.id,
          status: 'active'
        }
      });

      // 8. Send Dashboard Container to Channel's Text Chat
      await this.sendDashboard(newChannel, member.id);

    } catch (err) {
      Logger.error(`Failed to create tempvoice channel for ${member.id}`, err);
    }
  }

  /**
   * Applies permission bypasses for Social Engine relationships (Friends, Spouse, Family).
   */
  static async applySocialBypass(tenantId: string, guildId: string, ownerId: string, channel: VoiceChannel) {
    try {
      // Fetch friends
      const friends = await prisma.social_friends.findMany({
        where: { guildId, tenantId, status: 'accepted', OR: [{ user1Id: ownerId }, { user2Id: ownerId }] }
      });
      // Fetch marriage
      const marriage = await prisma.social_marriages.findFirst({
        where: { guildId, tenantId, status: 'married', OR: [{ user1Id: ownerId }, { user2Id: ownerId }] }
      });
      // Fetch family
      const familyMembership = await prisma.social_family_members.findFirst({
        where: { userId: ownerId, status: 'accepted' }
      });
      
      let familyMembers: any[] = [];
      if (familyMembership) {
        familyMembers = await prisma.social_family_members.findMany({
          where: { familyId: familyMembership.familyId, status: 'accepted' }
        });
      }

      const bypassUserIds = new Set<string>();

      friends.forEach(f => bypassUserIds.add(f.user1Id === ownerId ? f.user2Id : f.user1Id));
      if (marriage) bypassUserIds.add(marriage.user1Id === ownerId ? marriage.user2Id : marriage.user1Id);
      familyMembers.forEach(fm => { if (fm.userId !== ownerId) bypassUserIds.add(fm.userId); });

      for (const userId of bypassUserIds) {
        await channel.permissionOverwrites.create(userId, {
          ViewChannel: true,
          Connect: true,
          Speak: true
        }).catch(() => {});
      }
    } catch (err) {
      Logger.warn(`Social bypass apply failed: ${err}`);
    }
  }

  /**
   * Sends the V2 Container control dashboard to the newly created channel.
   */
  private static async sendDashboard(channel: VoiceChannel, ownerId: string) {
    const { ContainerService, sendV2 } = await import('../../../utils/container');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const row1 = new ActionRowBuilder().addComponents(
      // We use the same 'static' custom IDs here so interactionCreate doesn't need duplicates.
      // It will look up the session by user ID just like the global panel.
      new ButtonBuilder().setCustomId(`tv_static_lock`).setLabel('Lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
      new ButtonBuilder().setCustomId(`tv_static_unlock`).setLabel('Unlock').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
      new ButtonBuilder().setCustomId(`tv_static_hide`).setLabel('Hide (Ghost)').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
      new ButtonBuilder().setCustomId(`tv_static_show`).setLabel('Show').setStyle(ButtonStyle.Secondary).setEmoji('👀')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tv_static_rename`).setLabel('Rename').setStyle(ButtonStyle.Primary).setEmoji('📝'),
      new ButtonBuilder().setCustomId(`tv_static_limit`).setLabel('Set Limit').setStyle(ButtonStyle.Primary).setEmoji('👥'),
      new ButtonBuilder().setCustomId(`tv_static_transfer`).setLabel('Transfer').setStyle(ButtonStyle.Danger).setEmoji('👑')
    );

    const container = ContainerService.create({
      title: '🎙️ TempVoice Control Panel',
      description: `Welcome to your temporary channel, <@${ownerId}>!\n\nUse the buttons below to manage your room's privacy and settings. Only the owner can use these controls.`,
      color: '#ffb86c',
      components: [row1, row2]
    });

    try {
      await sendV2(channel, container);
    } catch (err) {
      Logger.warn(`Failed to send dashboard to ${channel.id}: ${err}`);
    }
  }

  /**
   * Handles a user leaving a voice channel.
   * If it's a temp channel and the owner leaves, initiate grace period or transfer.
   * If it's empty, delete it.
   */
  static async handleUserLeave(tenantId: string, member: GuildMember, oldState: VoiceState) {
    if (!oldState.channelId) return;

    const session = await prisma.tempvoice_sessions.findUnique({
      where: { channelId: oldState.channelId }
    });

    if (!session) return;

    const channel = await member.guild.channels.fetch(session.channelId).catch(() => null);
    if (!channel || !channel.isVoiceBased()) {
      // Channel no longer exists, clean up session
      await prisma.tempvoice_sessions.delete({ where: { channelId: oldState.channelId } }).catch(() => {});
      return;
    }

    if (channel.members.size === 0) {
      // Channel is completely empty. Delete immediately.
      await channel.delete('Temp channel empty').catch(() => {});
      await prisma.tempvoice_sessions.delete({ where: { channelId: oldState.channelId } }).catch(() => {});
      Logger.info(`Deleted empty tempvoice channel ${oldState.channelId}`);
      return;
    }

    if (member.id === session.ownerId) {
      // Owner left, but people are still here.
      // Wait 3 minutes (grace period). If owner isn't back, transfer to oldest member.
      Logger.info(`Owner ${member.id} left tempvoice channel ${channel.id}. Starting grace period.`);
      
      await prisma.tempvoice_sessions.update({
        where: { channelId: channel.id },
        data: { status: 'grace' }
      });

      setTimeout(async () => {
        // Re-check session
        const currentSession = await prisma.tempvoice_sessions.findUnique({ where: { channelId: channel.id } });
        if (!currentSession || currentSession.status !== 'grace') return; // Handled or deleted

        const currentChannel = await member.guild.channels.fetch(channel.id).catch(() => null);
        // Type guard: Only voice channels have a members Collection
        if (!currentChannel || !('members' in currentChannel && 'isVoiceBased' in currentChannel)) return;
        if (!currentChannel.isVoiceBased() || currentChannel.members.size === 0) return;

        // Has owner returned?
        if (currentChannel.members.has(session.ownerId)) {
          await prisma.tempvoice_sessions.update({
            where: { channelId: channel.id },
            data: { status: 'active' }
          });
          return;
        }

        // Transfer ownership to the first available member (longest connected usually)
        const nextOwner = currentChannel.members.first();
        if (nextOwner) {
          await prisma.tempvoice_sessions.update({
            where: { channelId: channel.id },
            data: { ownerId: nextOwner.id, status: 'inherited' }
          });
          
          // Update permissions
          if ('permissionOverwrites' in currentChannel) {
            await currentChannel.permissionOverwrites.create(nextOwner.id, {
              ManageChannels: true,
              MoveMembers: true,
              ViewChannel: true,
              Connect: true,
              Speak: true
            }).catch(() => {});
            
            await currentChannel.permissionOverwrites.delete(session.ownerId).catch(() => {});
          }

          if (currentChannel.isTextBased()) {
            await currentChannel.send(`👑 <@${session.ownerId}> didn't return. Ownership transferred to <@${nextOwner.id}>.`).catch(() => {});
          }
          Logger.info(`Transferred ownership of ${channel.id} to ${nextOwner.id}`);
        }

      }, 3 * 60 * 1000); // 3 minutes
    }
  }
}
