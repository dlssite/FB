import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TerritoryService } from '../../services/TerritoryService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('info')
      .setDescription('ℹ️ View details about the current territory.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const channel = interaction.channel as any;

    const territory = await TerritoryService.resolveLocation(tenantId, guildId, channel);

    if (!territory) {
      return await replyV2(interaction, ContainerService.simple('❌ This channel is not part of any registered Nation.'), true);
    }

    const info = TerritoryService.formatTerritoryInfo(territory);

    const response = ContainerService.create({
      title: `🏰 Nation: ${info.name}`,
      thumbnail: info.image || undefined,
      description: (territory as any).description || `This channel is part of the **${info.name}** territory.`,
      fields: [
        { name: '💎 Primary Resource', value: `\`${info.resource}\` (Base: ${info.basePrice} 💠)` },
        { name: '🔑 Access Role', value: `<@&${info.roles.access}>` },
        { name: '👑 Patron Role', value: info.roles.patron ? `<@&${info.roles.patron}>` : 'Not Set' },
        { name: '🚫 Ban Role', value: info.roles.ban ? `<@&${info.roles.ban}>` : 'Not Set' },
        { name: '📜 Log Channel', value: info.channels.log ? `<#${info.channels.log}>` : 'Not Set' },
        { name: '📢 Arrival Channel', value: info.channels.arrival ? `<#${info.channels.arrival}>` : 'Not Set' }
      ],
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response, false);
  }
};
