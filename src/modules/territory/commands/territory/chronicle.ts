import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TerritoryPowerService } from '../../services/TerritoryPowerService';
import { TerritoryPowerRepository } from '../../database/TerritoryPowerRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('chronicle')
      .setDescription('📜 View the history of actions in a territory.')
      .addStringOption(opt => opt.setName('territory').setDescription('Name of the territory'))
      .addIntegerOption(opt => opt.setName('limit').setDescription('Max entries (1-25)').setMinValue(1).setMaxValue(25)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const territoryName = interaction.options.getString('territory');
    const limit = interaction.options.getInteger('limit') || 10;

    const actor = interaction.member as GuildMember;
    const governed = await TerritoryPowerService.resolveGovernedTerritories(tenantId, guildId, actor);
    let territory = null;

    const channel = interaction.channel as any;
    if (channel?.parentId) {
      const channelTerritory = governed.find(t => t.categoryId === channel.parentId);
      if (channelTerritory) territory = channelTerritory;
    }

    if (territoryName && !territory) {
      territory = governed.find(t => t.name.toLowerCase() === territoryName.toLowerCase());
    } else if (governed.length === 1 && !territory) {
      territory = governed[0];
    }

    if (!territory) return replyV2(interaction, ContainerService.simple('❌ Territory not found or multiple options exist.'));

    try {
      const history = await TerritoryPowerRepository.getHistoryByNation(tenantId, guildId, territory.id, limit);

      if (history.length === 0) {
        return replyV2(interaction, ContainerService.simple(`ℹ️ No actions recorded for **${territory.name}** yet.`));
      }

      const list = history.map(h => {
        const ts = Math.floor(h.createdAt.getTime() / 1000);
        return `**${h.action}** — <@${h.targetId}>\n> By: <@${h.patronId}> • <t:${ts}:R>\n> Reason: ${h.reason || 'None'}`;
      }).join('\n\n');

      const response = ContainerService.create({
        title: `📜 Chronicle: ${territory.name}`,
        description: list,
        color: '#7367F0',
        footer: true,
        interaction
      });
      await interaction.editReply(response);
    } catch (err: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Error: ${err.message}`));
    }
  }
};
