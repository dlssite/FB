import { SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CountingRepository } from '../../database/CountingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcmd: SlashCommandSubcommandBuilder) =>
    subcmd
      .setName('reset')
      .setDescription('Admin: Manually reset the server count to zero'),

  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId as string;
    const guildId = interaction.guildId as string;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have permission to reset the count.'), true);
    }

    await CountingRepository.updateSettings(tenantId, guildId, {
      currentCount: 0,
      lastUserId: null
    });

    return await replyV2(interaction, ContainerService.create({
      title: '🔄 Counting Reset',
      description: `The counter has been manually reset to **0** by <@${interaction.user.id}>.`,
      color: '#E74C3C',
      interaction,
      footer: true
    }));
  }
};
