import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('list')
       .setDescription('📜 View all level role rewards'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const settings = await LevelingRepository.getSettings(context.tenantId, context.guildId);
    const rewards = (settings?.roleRewards as any[]) || [];

    if (rewards.length === 0) {
      return await interaction.editReply(ContainerService.simple('📜 No level rewards configured for this server.') as any);
    }

    const sorted = rewards.sort((a, b) => a.level - b.level);
    const lines = sorted.map(r => `• **Level ${r.level}** → <@&${r.roleId}>`).join('\n');

    const response = ContainerService.create({
      title: '📜 Server Level Rewards',
      description: `Experience progression path:\n\n${lines}\n\n*Role Stacking: **${settings?.roleRewardStack ? 'ON' : 'OFF'}***`,
      color: '#7367F0',
      interaction,
      footer: true
    });

    await interaction.editReply(response as any);
  }
};
