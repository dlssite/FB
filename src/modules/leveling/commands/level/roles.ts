import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('roles')
       .setDescription('🎭 Admin: Manage level-to-role mappings')
       .addIntegerOption(opt => opt.setName('level').setDescription('Target Level').setRequired(true))
       .addRoleOption(opt => opt.setName('role').setDescription('Role to grant (Leave empty to remove mapping)')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply(ContainerService.simple('❌ You do not have permission to manage leveling.') as any);
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const level = interaction.options.getInteger('level', true);
    const role = interaction.options.getRole('role');

    const settings = await LevelingRepository.getSettings(context.tenantId, context.guildId) || await LevelingRepository.initSettings(context.tenantId, context.guildId);
    let rewards = (settings.roleRewards as any[]) || [];

    if (!role) {
      // Remove mapping
      rewards = rewards.filter(r => r.level !== level);
    } else {
      // Upsert mapping
      rewards = rewards.filter(r => r.level !== level);
      rewards.push({ level, roleId: role.id });
    }

    await prisma.leveling_settings.update({
      where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
      data: { roleRewards: rewards }
    });

    const response = ContainerService.create({
      title: '🎭 Level Rewards Updated',
      description: role 
        ? `Citizens reaching **Level ${level}** will now be awarded the <@&${role.id}> role.`
        : `Removed reward for **Level ${level}**.`,
      color: '#7367F0',
      interaction,
      footer: true
    });

    await interaction.editReply(response as any);
  }
};
