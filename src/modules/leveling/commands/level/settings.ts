import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { GuildService } from '../../../../services/GuildService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('⚙️ Admin: Configure leveling settings')
       .addRoleOption(opt => opt.setName('top_role').setDescription('Role for the #1 leveler'))
       .addBooleanOption(opt => opt.setName('stack_roles').setDescription('Should level roles stack?')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have permission to manage leveling.'));
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const topRole = interaction.options.getRole('top_role');
    const stack = interaction.options.getBoolean('stack_roles');

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
      description += `✅ Role Stacking: **${stack ? 'Enabled' : 'Disabled'}**\n`;
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
