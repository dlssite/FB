import { SlashCommandSubcommandBuilder, ChannelType, ChatInputCommandInteraction, Role, APIRole } from 'discord.js';
import { TerritoryRepository } from '../../database/TerritoryRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('edit')
      .setDescription('📝 Edit an existing Nation registration.')
      .addChannelOption(opt => 
        opt.setName('category')
           .setDescription('The Category of the Nation to edit')
           .setRequired(true)
           .addChannelTypes(ChannelType.GuildCategory)
      )
      .addStringOption(opt => opt.setName('name').setDescription('New name for the Nation'))
      .addRoleOption(opt => opt.setName('access_role').setDescription('New access role'))
      .addStringOption(opt => opt.setName('resource').setDescription('New resource type'))
      .addIntegerOption(opt => opt.setName('price').setDescription('New base price'))
      .addStringOption(opt => opt.setName('image').setDescription('New banner image URL'))
      .addStringOption(opt => opt.setName('description').setDescription('New immersive lore description for the Nation'))
      .addRoleOption(opt => opt.setName('patron_role').setDescription('New patron role'))
      .addRoleOption(opt => opt.setName('ban_role').setDescription('New ban role'))
      .addChannelOption(opt => opt.setName('log_channel').setDescription('New log channel').addChannelTypes(ChannelType.GuildText))
      .addChannelOption(opt => opt.setName('arrival_channel').setDescription('New arrival channel').addChannelTypes(ChannelType.GuildText)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has('ManageGuild')) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have permission to edit Nations.'), true);
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const category = interaction.options.getChannel('category', true);

    // 1. Fetch existing to ensure we have a fallback
    const existing = await TerritoryRepository.getByCategoryId(tenantId, guildId, category.id);
    if (!existing) {
      return await replyV2(interaction, ContainerService.simple('❌ Could not find a registered Nation for that Category.'), true);
    }

    // 2. Resolve new values or fallback to existing
    const name = interaction.options.getString('name') ?? existing.name;
    
    const newAccessRole = interaction.options.getRole('access_role') as Role | APIRole | null;
    const accessRoleId = newAccessRole?.id ?? existing.roleId;

    const newPatronRole = interaction.options.getRole('patron_role') as Role | APIRole | null;
    const patronRoleId = newPatronRole?.id ?? existing.patronRoleId;

    const newBanRole = interaction.options.getRole('ban_role') as Role | APIRole | null;
    const banRoleId = newBanRole?.id ?? existing.banRoleId;

    const logChannel = interaction.options.getChannel('log_channel')?.id ?? existing.logChannelId;
    const arrivalChannel = interaction.options.getChannel('arrival_channel')?.id ?? existing.arrivalChannelId;
    
    const resource = interaction.options.getString('resource') ?? existing.resourceName;
    const price = interaction.options.getInteger('price') ?? existing.resourceBasePrice;
    const image = interaction.options.getString('image') ?? existing.imageUrl;
    const description = interaction.options.getString('description') ?? (existing as any).description;

    // 3. Robustness check
    if (!accessRoleId) {
      return await replyV2(interaction, ContainerService.simple('❌ Invalid access role specified.'), true);
    }

    // 4. Update the record
    await TerritoryRepository.upsertTerritory(tenantId, guildId, {
      name,
      categoryId: category.id,
      roleId: accessRoleId,
      resourceName: resource || undefined,
      resourceBasePrice: price || undefined,
      imageUrl: image || undefined,
      description: description || undefined,
      patronRoleId: patronRoleId || undefined,
      banRoleId: banRoleId || undefined,
      logChannelId: logChannel || undefined,
      arrivalChannelId: arrivalChannel || undefined,
    });

    const response = ContainerService.simple(
      `✅ Successfully updated the Nation registration for **${name}**.`
    );

    await replyV2(interaction, response, false);
  }
};
