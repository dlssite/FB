import { SlashCommandSubcommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { TerritoryRepository } from '../../database/TerritoryRepository';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('stats')
       .setDescription('📊 View census and infrastructure analytics for a nation.'),

  async execute(interaction: any) {
    const { guildId } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
    if (!nations.length) {
      return await replyV2(interaction, ContainerService.simple('❌ No nations registered in this sector.'));
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('trans_stats_select')
      .setPlaceholder('📊 Select a nation for analytics...')
      .addOptions(nations.map(n => ({
        label: n.name,
        value: n.id.toString(),
        emoji: '📊'
      })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    return await replyV2(interaction, ContainerService.create({
      title: '🏛️ Territory Intelligence Center',
      description: 'Select a nation below to view real-time census data, transit metrics, and infrastructure development status.',
      color: '#7367F0',
      components: [row],
      interaction,
      footer: true
    }));
  }
};
