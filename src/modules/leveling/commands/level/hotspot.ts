import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('hotspot')
       .setDescription('🔥 Admin: Set XP multipliers for channels')
       .addChannelOption(opt => opt.setName('channel').setDescription('Target Channel').setRequired(true))
       .addNumberOption(opt => opt.setName('multiplier').setDescription('XP Multiplier (e.g. 1.5, 2.0)')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply(ContainerService.simple('❌ You do not have permission to manage leveling.') as any);
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const channel = interaction.options.getChannel('channel', true);
    const multiplier = interaction.options.getNumber('multiplier');

    const settings = await LevelingRepository.getSettings(context.tenantId, context.guildId) || await LevelingRepository.initSettings(context.tenantId, context.guildId);
    let multipliers = (settings.xpMultipliers as Record<string, number>) || {};

    if (multiplier === null || multiplier === 1) {
      delete multipliers[channel.id];
    } else {
      multipliers[channel.id] = multiplier;
    }

    await prisma.leveling_settings.update({
      where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
      data: { xpMultipliers: multipliers }
    });

    const response = ContainerService.create({
      title: '🔥 XP Hotspot Updated',
      description: multiplier && multiplier !== 1
        ? `Channel **<#${channel.id}>** now has a **${multiplier}x** XP multiplier.`
        : `Removed multiplier from **<#${channel.id}>**.`,
      color: '#FF9F43',
      interaction,
      footer: true
    });

    await interaction.editReply(response as any);
  }
};
