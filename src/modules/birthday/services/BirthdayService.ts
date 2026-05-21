import { Client, Guild, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction, AttachmentBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorSpacingSize, MessageFlags } from 'discord.js';
import { prisma } from '../../../database/client';
import { BirthdayCanvasService } from './BirthdayCanvasService';
import { ContainerService } from '../../../utils/container';
import { tenantStorage } from '../../../utils/context';
import { Logger } from '../../../utils/logger';
import { RedisService } from '../../../services/RedisService';

export class BirthdayService {

  /**
   * Starts the background worker for birthday announcements and role cleanup
   */
  static startBirthdayWorker(client: Client) {
    Logger.info('Birthday Celebration workers started.', 'BirthdayService' as any);
    
    // Check every hour
    setInterval(async () => {
      const lock = await RedisService.acquireLock('lock:birthday:worker', 3500); // 1 hour approx
      if (lock) {
        await this.checkBirthdays(client);
        await this.cleanupBirthdayRoles(client);
      }
    }, 3600000); 

    // Immediate run on boot (with a short lock to allow other instances to see it)
    setTimeout(async () => {
      const lock = await RedisService.acquireLock('lock:birthday:boot', 60);
      if (lock) {
        await this.checkBirthdays(client);
        await this.cleanupBirthdayRoles(client);
      }
    }, 5000);
  }

  /**
   * Scans for users having a birthday today and announces them
   */
  static async checkBirthdays(client: Client) {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const birthdays = await prisma.user_birthdays.findMany({
      where: { day, month }
    });

    for (const record of birthdays) {
      // Skip if already celebrated this year
      if (record.lastCelebratedYear === year) continue;

      const guild = await client.guilds.fetch(record.guildId).catch(() => null);
      if (!guild) continue;

      const setting = await prisma.birthday_settings.findUnique({
        where: { 
          guildId_tenantId: {
            guildId: guild.id,
            tenantId: record.tenantId
          }
        }
      });
      if (!setting) continue;

      const channel = (setting.channelId ? await guild.channels.fetch(setting.channelId) : guild.systemChannel) as any;
      if (!channel) continue;

      // 1. Grant Role
      if (setting.roleId) {
        const member = await guild.members.fetch(record.userId).catch(() => null);
        if (member) await member.roles.add(setting.roleId).catch(() => {});
      }

      // 2. Bonus Embers are now CLAIMABLE via the button (logic moved to interaction handler)


      // 3. Announce
      const age = record.year ? year - record.year : null;
      const card = await this.generateBirthdayCard(client, guild.id, record.userId, setting, age);
      
      if (card) {
        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');
        
        const wishBtn = new ButtonBuilder()
          .setCustomId(`birthday_wish_${record.userId}`)
          .setLabel('🥳 Send a Wish')
          .setStyle(ButtonStyle.Primary);

        // Changed to Claim button - logic handled in interactionCreate.ts
        const giftBtn = new ButtonBuilder()
          .setCustomId(`birthday_claim_${record.userId}_${setting.bonusEmbers}`)
          .setLabel(`🎁 Claim Gift`)
          .setStyle(ButtonStyle.Success);

        // 1. Image and Message (from generator)
        // 2. Separator
        card.builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        
        // 3. Ping Role (Under message)
        const pingMention = setting.pingRoleId ? `<@&${setting.pingRoleId}>` : '';
        if (pingMention) {
          card.builder.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wake up! ${pingMention}`));
          card.builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        }

        // 4. Buttons
        const row = new ActionRowBuilder<any>().addComponents(wishBtn, giftBtn);
        card.builder.addActionRowComponents(row);

        // 5. Branding (Bottom)
        card.builder
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`© ${client.user?.username} Celebration Moment`)
          );

        await channel.send({ 
          components: [card.builder], 
          files: card.files,
          flags: MessageFlags.IsComponentsV2
        });

        Logger.success(`Announced celebration for ${record.userId} in guild ${guild.id}`);
      }

      // 4. Update Streak and Last Celebrated
      await prisma.user_birthdays.update({
        where: { id: record.id },
        data: { 
          lastCelebratedYear: year,
          streakCount: { increment: 1 }
        }
      });
    }
  }

  /**
   * Removes birthday roles after 24 hours
   */
  static async cleanupBirthdayRoles(client: Client) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;

    // Users whose birthday was yesterday
    const pastBirthdays = await prisma.user_birthdays.findMany({
      where: { day, month }
    });

    for (const record of pastBirthdays) {
      const guild = await client.guilds.fetch(record.guildId).catch(() => null);
      if (!guild) continue;

      const setting = await prisma.birthday_settings.findUnique({
        where: { 
          guildId_tenantId: {
            guildId: guild.id,
            tenantId: record.tenantId
          }
        }
      });
      if (!setting || !setting.roleId) continue;

      const member = await guild.members.fetch(record.userId).catch(() => null);
      if (member && member.roles.cache.has(setting.roleId)) {
        await member.roles.remove(setting.roleId).catch(() => {});
        Logger.info(`Removed expired birthday role from ${record.userId} in guild ${guild.id}`, 'BirthdayService' as any);
      }
    }
  }

  /**
   * Generates the immersive birthday announcement card with interactive buttons
   */
  static async generateBirthdayCard(client: Client, guildId: string, userId: string, setting: any, age?: number | null) {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return null;

    // Internal Canvas Generation (Using Skia)
    const bannerBuffer = await BirthdayCanvasService.generateBirthdayCard({
      username: user.username,
      avatarUrl: user.displayAvatarURL({ extension: 'png', size: 512 }),
      setting: setting
    }).catch((e) => {
      Logger.error(`Failed to generate birthday card for ${userId}`, e);
      return null;
    });

    const files = [];
    let imageUrl = null;
    if (Buffer.isBuffer(bannerBuffer)) {
      const attachment = new AttachmentBuilder(bannerBuffer, { name: 'birthday.png' });
      files.push(attachment);
      imageUrl = 'attachment://birthday.png';
    }

    const zodiac = this.getZodiac(new Date().getDate(), new Date().getMonth() + 1);
    
    // Parse message
    let contentMsg = setting.message || `Wish <@${userId}> a very Happy Birthday! 🎉`;
    contentMsg = contentMsg
      .replace(/{user}/g, `<@${userId}>`)
      .replace(/{age}/g, age ? age.toString() : '')
      .replace(/{zodiac}/g, zodiac);

    let profileText = `♑ Zodiac: **${zodiac}**`;
    if (age && setting.showAge) {
      profileText += `  •  🎂 Age: **${age}**`;
    }

    const builder = new ContainerBuilder()
      .setAccentColor(this.hexToDecimal(setting.embedColor || '#FFD700'));

    // Image/Banner First
    if (imageUrl) {
      builder.addMediaGalleryComponents(new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL(imageUrl)]));
      builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    } else if (setting.bgUrl) {
      builder.addMediaGalleryComponents(new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL(setting.bgUrl)]));
      builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // Message/Text Second
    builder.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🎂 Happy Birthday!\n${contentMsg}\n\n${profileText}`)
    );

    // Separators and other components are now added by the caller/announcer to ensure correct ordering with buttons
    return { builder, files };
  }

  /**
   * Helper to convert Hex to Decimal for ContainerBuilder
   */
  static hexToDecimal(hex: string): number {
    return parseInt(hex.replace('#', ''), 16) || 0x5865F2;
  }

  /**
   * Get Zodiac Sign
   */
  static getZodiac(day: number, month: number): string {
    const zodiacs = [
      { sign: '♑ Capricorn', lastDay: 19 },
      { sign: '♒ Aquarius', lastDay: 18 },
      { sign: '♓ Pisces', lastDay: 20 },
      { sign: '♈ Aries', lastDay: 19 },
      { sign: '♉ Taurus', lastDay: 20 },
      { sign: '♊ Gemini', lastDay: 20 },
      { sign: '♋ Cancer', lastDay: 22 },
      { sign: '♌ Leo', lastDay: 22 },
      { sign: '♍ Virgo', lastDay: 22 },
      { sign: '♎ Libra', lastDay: 22 },
      { sign: '♏ Scorpio', lastDay: 21 },
      { sign: '♐ Sagittarius', lastDay: 21 },
      { sign: '♑ Capricorn', lastDay: 31 }
    ];
    return day > zodiacs[month - 1].lastDay ? zodiacs[month].sign : zodiacs[month - 1].sign;
  }
}
