import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { Logger } from '../../../utils/logger';

// Import subcommand handlers
import * as panelCreate from './ticket/panelCreate';
import * as optionAdd from './ticket/optionAdd';
import * as add from './ticket/add';
import * as remove from './ticket/remove';
import * as claim from './ticket/claim';
import * as close from './ticket/close';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Advanced ticket system commands.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    // Admin: Panel Setup
    .addSubcommandGroup(group => group
      .setName('panel')
      .setDescription('Manage ticket panels')
      .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Create a new ticket panel')
        .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Where to deploy').addChannelTypes(ChannelType.GuildText).setRequired(true))
      )
    )
    // Admin: Options Setup
    .addSubcommandGroup(group => group
      .setName('option')
      .setDescription('Manage panel options')
      .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Add a new option to a panel')
        .addStringOption(opt => opt.setName('panel_id').setDescription('The message ID of the panel').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('Option name (e.g. Report User)').setRequired(true))
        .addRoleOption(opt => opt.setName('staff_role').setDescription('Role to ping').setRequired(true))
        .addChannelOption(opt => opt.setName('logs').setDescription('Transcript channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addChannelOption(opt => opt.setName('category').setDescription('Category to spawn tickets').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for option').setRequired(false))
      )
    )
    // Staff: Management
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a user to the current ticket')
      .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a user from the current ticket')
      .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('claim')
      .setDescription('Claim the current ticket')
    )
    .addSubcommand(sub => sub
      .setName('close')
      .setDescription('Close the current ticket')
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for closing').setRequired(false))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const group = interaction.options.getSubcommandGroup();
    const command = interaction.options.getSubcommand();

    try {
      // Admin: Panel Commands
      if (group === 'panel') {
        if (command === 'create') return await panelCreate.execute(interaction);
      }

      // Admin: Option Commands
      if (group === 'option') {
        if (command === 'add') return await optionAdd.execute(interaction);
      }

      // Staff Commands
      if (command === 'add') return await add.execute(interaction);
      if (command === 'remove') return await remove.execute(interaction);
      if (command === 'claim') return await claim.execute(interaction);
      if (command === 'close') return await close.execute(interaction);

      return interaction.editReply({ content: '❌ Unknown subcommand.' });

    } catch (error) {
      Logger.error(`Ticket Command Routing Error`, error);
      return interaction.editReply({ content: 'An error occurred.' }).catch(() => {});
    }
  }
};
