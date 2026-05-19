import { SlashCommandSubcommandBuilder, ChannelType, ChatInputCommandInteraction, Role, APIRole } from 'discord.js';
import { TerritoryRepository } from '../../database/TerritoryRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('register')
      .setDescription('🗺️ Register a Discord Category as a Nation.')
      .addChannelOption(opt => 
        opt.setName('category')
           .setDescription('The Category to register')
           .setRequired(true)
           .addChannelTypes(ChannelType.GuildCategory)
      )
      .addStringOption(opt => 
        opt.setName('name')
           .setDescription('The name of this Nation')
           .setRequired(true)
      )
      .addRoleOption(opt => 
        opt.setName('access_role')
           .setDescription('The role required to access this Nation')
           .setRequired(true)
      )
      .addStringOption(opt => 
        opt.setName('resource')
           .setDescription('The primary resource available for mining here')
      )
      .addIntegerOption(opt => 
        opt.setName('price')
           .setDescription('Base market price for the resource')
      )
      .addStringOption(opt => 
        opt.setName('image')
           .setDescription('Banner image URL for this Nation')
      )
      .addStringOption(opt => 
        opt.setName('description')
           .setDescription('Immersive lore description of this Nation for the AI Cognitive Engine')
      )
      .addRoleOption(opt => 
        opt.setName('patron_role')
           .setDescription('Role for the Nation patron')
      )
      .addRoleOption(opt => 
        opt.setName('ban_role')
           .setDescription('Role used to ban users from this Nation')
      )
      .addChannelOption(opt =>
        opt.setName('log_channel')
           .setDescription('Channel for territory-specific logs')
           .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption(opt =>
        opt.setName('arrival_channel')
           .setDescription('Channel for arrival notifications')
           .addChannelTypes(ChannelType.GuildText)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has('ManageGuild')) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have permission to register Nations.'), true);
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const category = interaction.options.getChannel('category', true);
    const name = interaction.options.getString('name', true);
    const accessRole = interaction.options.getRole('access_role', true) as Role | APIRole;
    const resource = interaction.options.getString('resource');
    const price = interaction.options.getInteger('price');
    const image = interaction.options.getString('image');
    const description = interaction.options.getString('description');
    const patronRole = interaction.options.getRole('patron_role');
    const banRole = interaction.options.getRole('ban_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const arrivalChannel = interaction.options.getChannel('arrival_channel');

    // Robustness check
    if (!accessRole.id) {
      return await replyV2(interaction, ContainerService.simple('❌ Invalid access role specified.'), true);
    }

    await TerritoryRepository.upsertTerritory(tenantId, guildId, {
      name,
      categoryId: category.id,
      roleId: accessRole.id,
      resourceName: resource || undefined,
      resourceBasePrice: price || undefined,
      imageUrl: image || undefined,
      description: description || undefined,
      patronRoleId: patronRole?.id || undefined,
      banRoleId: banRole?.id || undefined,
      logChannelId: logChannel?.id || undefined,
      arrivalChannelId: arrivalChannel?.id || undefined,
    });

    const response = ContainerService.simple(
      `✅ Successfully registered **${name}** as a Nation.\n` +
      `📍 **Category:** <#${category.id}>\n` +
      `🔑 **Access Role:** <@&${accessRole.id}>\n` +
      `💎 **Resource:** ${resource || 'None'}\n` +
      `📝 **Description:** ${description || 'None'}\n` +
      `🖼️ **Banner:** ${image ? '[View](' + image + ')' : 'Default'}`
    );

    await replyV2(interaction, response, false);
  }
};
