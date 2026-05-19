import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, Role, Channel, ChannelType } from 'discord.js';
import { prisma } from '../../../../database/client';
import { AutoService, MatchType } from '../../services/AutoService';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('⚙️ Adjust advanced settings for a trigger.')
       .addStringOption(opt => opt.setName('name').setDescription('The trigger to configure').setRequired(true))
       .addStringOption(opt => 
         opt.setName('match_type')
            .setDescription('Match Type')
            .addChoices(
              { name: 'Contains Word', value: MatchType.CONTAINS },
              { name: 'Exact Match', value: MatchType.EXACT },
              { name: 'Starts With', value: MatchType.STARTS_WITH },
              { name: 'Advanced RegEx', value: MatchType.REGEX }
            )
       )
       .addIntegerOption(opt => opt.setName('chance').setDescription('Execution probability (1-100%)').setMinValue(1).setMaxValue(100))
       .addIntegerOption(opt => opt.setName('cooldown').setDescription('Per-user cooldown in seconds').setMinValue(0))
       .addChannelOption(opt => opt.setName('add_channel').setDescription('Restrict to this channel').addChannelTypes(ChannelType.GuildText))
       .addRoleOption(opt => opt.setName('add_role').setDescription('Require this role'))
       .addBooleanOption(opt => opt.setName('clear_channels').setDescription('Remove ALL channel restrictions from this trigger'))
       .addBooleanOption(opt => opt.setName('clear_roles').setDescription('Remove ALL role restrictions from this trigger')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const name = interaction.options.getString('name', true);
    
    const trigger = await prisma.auto_triggers.findFirst({
      where: { tenantId: context.tenantId, guildId: context.guildId, name }
    });

    if (!trigger) {
      return await interaction.editReply(
        ContainerService.simple(`❌ No trigger found with the name **${name}**.`) as any
      );
    }

    const matchType = interaction.options.getString('match_type');
    const chance = interaction.options.getInteger('chance');
    const cooldown = interaction.options.getInteger('cooldown');
    const addChannel = interaction.options.getChannel('add_channel') as Channel | null;
    const addRole = interaction.options.getRole('add_role') as Role | null;
    const clearChannels = interaction.options.getBoolean('clear_channels');
    const clearRoles = interaction.options.getBoolean('clear_roles');

    const updateData: any = {};
    if (matchType) updateData.matchType = matchType;
    if (chance !== null) updateData.chance = chance;
    if (cooldown !== null) updateData.cooldown = cooldown;

    // Clear all channel/role restrictions first
    if (clearChannels) updateData.channels = [];
    if (clearRoles) updateData.roles = [];
    
    if (addChannel && !clearChannels) {
      const currentChannels = trigger.channels as string[];
      if (!currentChannels.includes(addChannel.id)) {
        updateData.channels = [...currentChannels, addChannel.id];
      }
    }

    if (addRole && !clearRoles) {
      const currentRoles = trigger.roles as string[];
      if (!currentRoles.includes(addRole.id)) {
        updateData.roles = [...currentRoles, addRole.id];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return await interaction.editReply(ContainerService.simple('ℹ️ No settings were changed.') as any);
    }

    await prisma.auto_triggers.update({
      where: { id: trigger.id },
      data: updateData
    });

    AutoService.clearCache(context.guildId);

    const container = ContainerService.create({
      title: '⚙️ Trigger Settings Updated',
      description: `Advanced mechanics for **${name}** have been applied.`,
      color: '#28C76F',
      footer: true,
      interaction
    });

    await interaction.editReply(container as any);
  }
};
