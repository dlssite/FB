import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TerritoryRepository } from '../../database/TerritoryRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('remove')
      .setDescription('🗑️ Remove a Nation registration.')
      .addChannelOption(opt => 
        opt.setName('category')
           .setDescription('The Category of the Nation to remove')
           .setRequired(true)
           .addChannelTypes(4) // GuildCategory
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has('ManageGuild')) {
      return await replyV2(interaction, ContainerService.simple('❌ You need ManageGuild permission to use this command.')
      );
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const category = interaction.options.getChannel('category', true);

    const existing = await TerritoryRepository.getByCategoryId(tenantId, guildId, category.id);
    if (!existing) {
      return await replyV2(interaction, ContainerService.simple('❌ Nation not found in this category.')
      );
    }

    await TerritoryRepository.removeTerritory(tenantId, guildId, category.id);

    const response = ContainerService.simple(
      `✅ Successfully removed the Nation registration for **${existing.name}**.`
    );

    await interaction.editReply(response);
  }
};
