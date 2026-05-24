import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('blacklist')
       .setDescription('🚫 Admin: Prevent XP gain in channels or for roles')
       .addChannelOption(opt => opt.setName('channel').setDescription('Channel to ignore'))
       .addRoleOption(opt => opt.setName('role').setDescription('Role to ignore'))
       .addBooleanOption(opt => opt.setName('remove').setDescription('Remove from blacklist instead?')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have permission to manage leveling.'));
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const remove = interaction.options.getBoolean('remove') || false;

    const settings = await LevelingRepository.getSettings(context.tenantId, context.guildId) || await LevelingRepository.initSettings(context.tenantId, context.guildId);
    
    let description = '';
    if (channel) {
      let ignored = (settings.ignoredChannels as string[]) || [];
      if (remove) ignored = ignored.filter(id => id !== channel.id);
      else if (!ignored.includes(channel.id)) ignored.push(channel.id);
      
      await prisma.leveling_settings.update({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        data: { noXpChannels: ignored }
      });
      description += `✅ Channel **<#${channel.id}>** ${remove ? 'removed from' : 'added to'} blacklist.\n`;
    }

    if (role) {
      let ignored = (settings.ignoredRoles as string[]) || [];
      if (remove) ignored = ignored.filter(id => id !== role.id);
      else if (!ignored.includes(role.id)) ignored.push(role.id);
      
      await prisma.leveling_settings.update({
        where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
        data: { noXpRoles: ignored }
      });
      description += `✅ Role **<@&${role.id}>** ${remove ? 'removed from' : 'added to'} blacklist.\n`;
    }

    const response = ContainerService.create({
      title: '🚫 Blacklist Updated',
      description: description || 'Please specify a channel or role.',
      color: '#EA5455',
      interaction,
      footer: true
    });

    await replyV2(interaction, response);
  }
};
