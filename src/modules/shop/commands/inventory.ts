import { SlashCommandBuilder } from 'discord.js';
import { RoutingService } from '../../../services/RoutingService';
import { renderInventoryPanel } from '../events/interactionCreate';

export default {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('🎒 View your collected items and assets.')
    .addStringOption(opt => opt.setName('category').setDescription('Filter by category')),

  async execute(interaction: any) {
    const { guild, member, options } = interaction;
    const guildId = guild.id;
    const categoryQuery = options.getString('category');

    // Resolve tenant for economy/shop
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    return await renderInventoryPanel(interaction, tenantId, guildId, member.id, categoryQuery, 0);
  }
};
