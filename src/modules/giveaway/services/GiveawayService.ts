import { Client, GuildMember, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GiveawayRepository } from '../database/GiveawayRepository';
import { prisma } from '../../../database/client';
import { RedisService } from '../../../services/RedisService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';

export class GiveawayService {

  static hexToDecimal(hex: string): number {
    return parseInt(hex.replace('#', ''), 16) || 0x7367F0;
  }

  // ─── Requirement Validation ──────────────────────────────────────────────────
  static async validateRequirements(tenantId: string, guildId: string, member: GuildMember, reqs: any): Promise<{ passed: boolean; reason?: string }> {
    if (!reqs || Object.keys(reqs).length === 0) return { passed: true };

    if (reqs.roleId && !member.roles.cache.has(reqs.roleId)) {
      return { passed: false, reason: `You must have the <@&${reqs.roleId}> role.` };
    }

    if (reqs.minLevel || reqs.minBalance) {
      const user = await prisma.flameborn_users.findUnique({
        where: { userId_tenantId: { userId: member.id, tenantId } }
      });

      if (!user) {
        return { passed: false, reason: 'You do not have a registered profile. Earn some XP or Balance first.' };
      }

      if (reqs.minBalance && (user.embers || 0n) < BigInt(reqs.minBalance)) {
        return { passed: false, reason: `You need at least **${reqs.minBalance}** Embers to enter.` };
      }
    }

    return { passed: true };
  }

  // ─── UI Container Builder ────────────────────────────────────────────────────
  /**
   * Builds the V2 ContainerBuilder for a giveaway embed.
   * @param messageId — The Discord message ID; embedded into the button customId.
   */
  static buildGiveawayContainer(
    giveaway: {
      prize: string;
      hostId: string;
      sponsorId?: string | null;
      endTime: Date;
      winners: number;
      color?: string | null;
      description?: string | null;
      drop?: boolean;
      requirements?: any;
    },
    messageId: string,
    participantsCount: number,
    ended: boolean,
    winnerList?: string
  ): ContainerBuilder {

    const builder = new ContainerBuilder()
      .setAccentColor(this.hexToDecimal(giveaway.color || flamebornConfig.branding.color));

    if (flamebornConfig.assets.giveawayBanner) {
      builder.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems([
          new MediaGalleryItemBuilder().setURL(flamebornConfig.assets.giveawayBanner)
        ])
      );
      builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    const titleIcon = giveaway.drop ? '⚡' : '🎁';
    let contentMsg = `# ${titleIcon} ${giveaway.prize}\n`;

    if (giveaway.description) contentMsg += `> ${giveaway.description}\n\n`;

    if (ended) {
      contentMsg += `**Status:** Ended\n**Winners:** ${winnerList || 'None'}\n`;
    } else if (giveaway.drop) {
      contentMsg += `**Status:** First **${giveaway.winners}** to claim wins!\n`;
    } else {
      contentMsg += `**Ends:** <t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>\n`;
    }

    contentMsg += `**Hosted by:** <@${giveaway.hostId}>\n`;
    if (giveaway.sponsorId && giveaway.sponsorId !== giveaway.hostId) {
      contentMsg += `**Sponsored by:** <@${giveaway.sponsorId}>\n`;
    }

    if (giveaway.requirements && Object.keys(giveaway.requirements).length > 0) {
      const reqs = [];
      if (giveaway.requirements.roleId) reqs.push(`Role: <@&${giveaway.requirements.roleId}>`);
      if (giveaway.requirements.minBalance) reqs.push(`Balance: **${giveaway.requirements.minBalance}**`);
      if (reqs.length > 0) contentMsg += `**Requirements:** ${reqs.join(' | ')}\n`;
    }

    builder.addTextDisplayComponents(new TextDisplayBuilder().setContent(contentMsg));
    builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    builder.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`👥 **Participants:** ${participantsCount}`)
    );

    const joinBtn = new ButtonBuilder()
      .setCustomId(`giveaway_join_${messageId}`)
      .setLabel(giveaway.drop ? '⚡ Claim Drop' : '🎉 Enter Giveaway')
      .setStyle(giveaway.drop ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(ended);

    builder.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn));
    return builder;
  }

  // ─── End Giveaway (flush-on-end) ─────────────────────────────────────────────
  static async endGiveaway(client: Client, tenantId: string, messageId: string, giveawayData?: any, forcedBy?: string) {
    let giveaway = giveawayData;
    if (!giveaway) {
      giveaway = await GiveawayRepository.getGiveaway(tenantId, messageId);
    }

    if (!giveaway || giveaway.ended) return null;

    // 1. Flush Redis entry set → DB and get the pool
    const pool = await GiveawayRepository.flushEntriesToDb(tenantId, giveaway.id);

    // 2. Pick winners from pool (in-memory — O(N) one-time)
    const winners: string[] = [];
    if (pool.length > 0) {
      const available = [...pool];
      for (let i = 0; i < giveaway.winners; i++) {
        if (available.length === 0) break;
        const index = Math.floor(Math.random() * available.length);
        winners.push(available[index]);
        available.splice(index, 1);
      }
    }

    // 3. Mark ended in DB + invalidate Redis meta + remove from schedule
    await GiveawayRepository.markEnded(tenantId, messageId);

    // 4. Update Discord message
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null) as any;
    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      const winnerMentions = winners.length > 0 ? winners.map((id: string) => `<@${id}>`).join(', ') : 'No valid entries';

      if (message) {
        const builder = this.buildGiveawayContainer(giveaway, messageId, pool.length, true, winnerMentions);
        await message.edit({
          components: [builder],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }

      // 5. Announce
      if (winners.length > 0) {
        await channel.send({ content: winnerMentions }).catch(() => {});

        const announceBuilder = new ContainerBuilder()
          .setAccentColor(this.hexToDecimal('#FFD700'))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🎊 Giveaway Ended\nCongratulations to ${winnerMentions} for winning **${giveaway.prize}**!`)
          );

        await channel.send({ components: [announceBuilder], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      } else {
        const announceBuilder = new ContainerBuilder()
          .setAccentColor(this.hexToDecimal('#FF0000'))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🎊 Giveaway Ended\nNobody entered for **${giveaway.prize}**, so a winner could not be chosen.`)
          );

        await channel.send({ components: [announceBuilder], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    }

    Logger.success(`Giveaway ${messageId} ended. Winners: ${winners.join(',')}`);
    return winners;
  }

  static async executeEnd(client: Client, tenantId: string, messageId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const giveaway = await GiveawayRepository.getGiveaway(tenantId, messageId);
    if (!giveaway || giveaway.ended) {
      return { success: false, error: 'error_not_found' };
    }
    await this.endGiveaway(client, tenantId, messageId, giveaway, userId);
    return { success: true };
  }

  static async executeCancel(client: Client, tenantId: string, messageId: string): Promise<{ success: boolean; error?: string }> {
    const giveaway = await GiveawayRepository.getGiveaway(tenantId, messageId);
    if (!giveaway || giveaway.ended) {
      return { success: false, error: 'error_not_found' };
    }

    await GiveawayRepository.markEnded(tenantId, messageId);
    await RedisService.client.del(GiveawayRepository.entryKey(giveaway.id));

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null) as any;
    if (channel) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) await msg.delete().catch(() => {});
    }

    return { success: true };
  }

  static async executeReroll(client: Client, tenantId: string, messageId: string): Promise<{ success: boolean; error?: string }> {
    const giveaway = await GiveawayRepository.getGiveaway(tenantId, messageId);
    if (!giveaway || !giveaway.ended) {
      return { success: false, error: 'error_active' };
    }

    const pool = await GiveawayRepository.getDbEntries(tenantId, giveaway.id);
    if (pool.length === 0) {
      return { success: false, error: 'error_no_entries' };
    }

    const winners: string[] = [];
    const available = [...pool];
    for (let i = 0; i < giveaway.winners; i++) {
      if (available.length === 0) break;
      const index = Math.floor(Math.random() * available.length);
      winners.push(available[index]);
      available.splice(index, 1);
    }

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null) as any;
    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        const builder = this.buildGiveawayContainer(giveaway, messageId, pool.length, true, winnerMentions);
        await message.edit({
          components: [builder],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
      }

      await channel.send({ content: winnerMentions }).catch(() => {});

      const announceBuilder = new ContainerBuilder()
        .setAccentColor(this.hexToDecimal('#FFD700'))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 🎊 Giveaway Rerolled\nCongratulations to ${winnerMentions} for winning **${giveaway.prize}**!`)
        );

      await channel.send({
        components: [announceBuilder],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
    }

    return { success: true };
  }
}
