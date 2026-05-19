import { StreakRepository } from '../../database/StreakRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { PermissionFlagsBits } from 'discord.js';

export default {
  subName: 'manage',
  // Normally handled by router, but good practice
  defaultMemberPermissions: PermissionFlagsBits.Administrator,

  async execute(interaction: any) {
    // Only allow admins
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      const container = ContainerService.create({
        title: '❌ Access Denied',
        description: 'You need Administrator permissions to manage streaks.',
        color: '#FF0000',
        interaction
      });
      return await replyV2(interaction, container, true);
    }

    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId || flamebornConfig.bot.tenant.id;
    const guildId = interaction.guildId;

    const role = interaction.options.getRole('top_role');
    const enabled = interaction.options.getBoolean('enabled');

    const updateData: any = {};
    let desc = 'Streak settings updated:\n';

    if (role) {
      updateData.topStreakRoleId = role.id;
      desc += `- **Top Streak Role:** <@&${role.id}>\n`;
    }

    if (enabled !== null) {
      updateData.enabled = enabled;
      desc += `- **Module Enabled:** ${enabled ? 'Yes' : 'No'}\n`;
    }

    if (Object.keys(updateData).length === 0) {
      const container = ContainerService.create({
        title: '⚠️ No Changes',
        description: 'You did not provide any settings to update.',
        color: '#FFA500',
        interaction
      });
      return await replyV2(interaction, container, true);
    }

    // Update settings via Prisma
    const { prisma } = await import('../../../../database/client');
    await prisma.streak_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: updateData,
      create: {
        guildId,
        tenantId,
        ...updateData
      }
    });

    const container = ContainerService.create({
      title: '✅ Settings Saved',
      description: desc,
      color: '#00FF00',
      interaction
    });
    
    await replyV2(interaction, container);
  }
};
