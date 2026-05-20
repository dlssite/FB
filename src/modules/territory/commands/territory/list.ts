import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TerritoryRepository } from '../../database/TerritoryRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('list')
      .setDescription('📋 List all registered Nations in this server.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;

    const territories = await TerritoryRepository.listByGuild(tenantId, guildId);

    if (territories.length === 0) {
      return await interaction.editReply(
        ContainerService.simple('❌ No nations registered in this server yet.')
      );
    }

    const territoryList = territories
      .map(t => `• **${t.name}** (<#${t.categoryId}>) - 💎 \`${t.resourceName || 'None'}\``)
      .join('\n');

    const response = ContainerService.create({
      title: '🌍 Global Nation Registry',
      description: `There are **${territories.length}** registered Nations in this server:\n\n${territoryList}`,
      color: '#7367F0',
      footer: true,
      interaction
    });

    await interaction.editReply(response);
  }
};
