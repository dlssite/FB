import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { GuildService } from '../../../../services/GuildService';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('⚙️ Admin: Configure leveling settings')
       .addRoleOption(opt => opt.setName('top_role').setDescription('Role for the #1 leveler'))
       .addBooleanOption(opt => opt.setName('stack_roles').setDescription('Should level roles stack?'))
       .addChannelOption(opt => opt.setName('announcement_channel').setDescription('Channel to send level-up announcements'))
       .addStringOption(opt => opt.setName('level_style').setDescription('Announcement style').addChoices(
         { name: 'Text', value: 'text' },
         { name: 'Canvas', value: 'canvas' }
       ))
       .addStringOption(opt => opt.setName('level_message').setDescription('Custom level-up announcement template').setMinLength(5).setMaxLength(2000))
       .addStringOption(opt => opt.setName('level_reaction').setDescription('Emoji to react with when a user levels up').setMinLength(1).setMaxLength(50)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have permission to manage leveling.'));
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const topRole = interaction.options.getRole('top_role');
    const stack = interaction.options.getBoolean('stack_roles');
    const announcementChannel = interaction.options.getChannel('announcement_channel');
    const style = interaction.options.getString('level_style');
    const customMessage = interaction.options.getString('level_message');
    const reactionEmoji = interaction.options.getString('level_reaction');

    let description = '';
    if (topRole) {
      await GuildService.updateTopLevelerRole(context.tenantId, context.guildId, topRole.id);
      description += `✅ Top Leveler Role: <@&${topRole.id}>\n`;
    }

    if (stack !== null) {
      const now = new Date();
      await prisma.leveling_settings.upsert({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        update: { roleRewardStack: stack, updatedAt: now },
        create: {
          guildId: context.guildId,
          tenantId: context.tenantId,
          roleRewardStack: stack,
          createdAt: now,
          updatedAt: now
        }
      });
      await LevelingRepository.invalidateCache(context.tenantId, context.guildId);
      description += `✅ Role Stacking: **${stack ? 'Enabled' : 'Disabled'}**\n`;
    }

    if (announcementChannel) {
      // Ensure the chosen channel is text-like (type-guard at runtime)
      if (!announcementChannel || typeof (announcementChannel as any).isTextBased !== 'function' || !(announcementChannel as any).isTextBased()) {
        return await replyV2(interaction, ContainerService.simple('❌ Announcement channel must be a text channel.'));
      }
      const now = new Date();
      await prisma.leveling_settings.upsert({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        update: ({ levelingChannelId: announcementChannel.id, updatedAt: now } as any),
        create: ({
          guildId: context.guildId,
          tenantId: context.tenantId,
          levelingChannelId: announcementChannel.id,
          createdAt: now,
          updatedAt: now
        } as any)
      });
      await LevelingRepository.invalidateCache(context.tenantId, context.guildId);
      description += `✅ Announcement Channel: <#${announcementChannel.id}>\n`;
    }

    if (customMessage) {
      const now = new Date();
      await prisma.leveling_settings.upsert({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        update: { levelingMessage: customMessage, updatedAt: now },
        create: {
          guildId: context.guildId,
          tenantId: context.tenantId,
          levelingMessage: customMessage,
          createdAt: now,
          updatedAt: now
        }
      });
      await LevelingRepository.invalidateCache(context.tenantId, context.guildId);
      description += `✅ Level Message Updated\n`;
    }

    if (style) {
      const now = new Date();
      await prisma.leveling_settings.upsert({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        update: { levelingImageEnabled: style === 'canvas', updatedAt: now },
        create: {
          guildId: context.guildId,
          tenantId: context.tenantId,
          levelingImageEnabled: style === 'canvas',
          createdAt: now,
          updatedAt: now
        }
      });
      await LevelingRepository.invalidateCache(context.tenantId, context.guildId);
      description += `✅ Announcement Style: **${style === 'canvas' ? 'Canvas' : 'Text'}**\n`;
    }

    if (reactionEmoji) {
      const now = new Date();
      await prisma.leveling_settings.upsert({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        update: ({ levelingReaction: reactionEmoji, updatedAt: now } as any),
        create: ({
          guildId: context.guildId,
          tenantId: context.tenantId,
          levelingReaction: reactionEmoji,
          createdAt: now,
          updatedAt: now
        } as any)
      });
      await LevelingRepository.invalidateCache(context.tenantId, context.guildId);
      description += `✅ Level Reaction: ${reactionEmoji}\n`;
    }

    const response = ContainerService.create({
      title: '⚙️ Leveling Settings Updated',
      description: description || 'No changes applied.',
      color: '#28C76F',
      interaction,
      footer: true
    });

    await replyV2(interaction, response);
  }
};
