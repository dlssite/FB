import { Events, GuildMember, TextChannel } from 'discord.js';
import { InviteTracker } from '../services/InviteTracker';
import { InviteService } from '../services/InviteService';
import { InviteRepository } from '../database/InviteRepository';
import { RoutingService } from '../../../services/RoutingService';
import { GuildService } from '../../../services/GuildService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';
import { ContainerService } from '../../../utils/container';

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    if (!flamebornConfig.modules.invite.active || member.user.bot) return;

    try {
      const tenantId = await RoutingService.resolveTenantId(member.guild.id, 'invite');
      const settings = await InviteRepository.getSettings(tenantId, member.guild.id);
      const guildSettings = await GuildService.getSettings(tenantId, member.guild.id);
      
      // 1. Resolve which invite was used
      const usedInvite = await InviteTracker.resolveUsedInvite(member.guild);
      const inviterId = usedInvite?.inviterId || null;
      const code = usedInvite?.code || null;
      const codeUses = usedInvite?.uses || 0;

      if (inviterId) {
        Logger.info(`Member ${member.user.tag} joined using invite from ${inviterId} (${code || 'Unknown Code'})`, 'INVITE' as any);
      } else {
        Logger.info(`Member ${member.user.tag} joined but no inviter could be resolved (Vanity URL or Unknown).`, 'INVITE' as any);
      }

      // 2. Evaluate Anti-Abuse (Fakes & Rejoins)
      let isFake = false;
      let isRejoin = false;

      // A. Fake Check
      const thresholdDays = settings?.fakeThreshold || flamebornConfig.invite.defaultFakeThresholdDays;
      const accountAgeMs = Date.now() - member.user.createdTimestamp;
      const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
      
      if (accountAgeDays < thresholdDays) {
        isFake = true;
      }

      // B. Rejoin Check
      isRejoin = await InviteRepository.hasJoinedBefore(tenantId, member.guild.id, member.id);

      // 3. Log History
      await InviteRepository.logHistory(tenantId, member.guild.id, member.id, inviterId, code, isRejoin);

      // 4. Update Inviter Stats
      if (inviterId && inviterId !== member.id && inviterId !== 'VANITY') {
        // Ensure inviter has a stats record
        await InviteRepository.getUserStats(tenantId, member.guild.id, inviterId);

        // Always increment Joins. We balance this by always incrementing Leaves on exit.
        await InviteRepository.addJoins(tenantId, member.guild.id, inviterId, 1);
        
        if (isFake) {
          await InviteRepository.addFakes(tenantId, member.guild.id, inviterId, 1);
        }

        if (isRejoin) {
          await InviteRepository.addRejoin(tenantId, member.guild.id, inviterId, 1);
        }

        // 5. Evaluate Roles for the Inviter
        await InviteService.syncUserRoles(tenantId, member.guild, inviterId);
      }

      // 6. Send Log to Channel
      if (guildSettings.inviteChannelId) {
        const logChannel = member.guild.channels.cache.get(guildSettings.inviteChannelId) as TextChannel;
        if (logChannel) {
          let inviterDisplay = 'Unknown/Vanity';
          if (inviterId === 'VANITY') {
            inviterDisplay = `Vanity URL (${code})`;
          } else if (inviterId) {
            const inviterUser = await member.client.users.fetch(inviterId).catch(() => null);
            inviterDisplay = inviterUser ? `${inviterUser.tag} (<@${inviterId}>)` : `User ${inviterId}`;
          }

          const container = ContainerService.create({
            title: '📥 New Member Joined',
            description: `**${member.user.tag}** joined the server!`,
            color: isFake ? '#FF4D4D' : '#4DFF4D',
            thumbnail: member.user.displayAvatarURL(),
            fields: [
              { name: '👤 Member', value: `<@${member.id}>`, inline: true },
              { name: '🔗 Invited By', value: inviterDisplay, inline: true },
              { name: '🎫 Invite Code', value: `\`${code || 'Unknown'}\` (${codeUses} uses)`, inline: true },
              { name: '🕒 Account Age', value: `${Math.floor(accountAgeDays)} days`, inline: true },
              { name: '🚩 Status', value: isFake ? '⚠️ Possible Fake' : (isRejoin ? '🔄 Rejoin' : '✅ Regular Join'), inline: true }
            ],
            footer: true,
            interaction: null as any // Using null because we don't have an interaction here
          });

          await logChannel.send(container as any).catch(() => {});
        }
      }
    } catch (err) {
      Logger.error(`Error in guildMemberAdd (Invite Module) for member ${member.id}`, err);
    }
  }
};
