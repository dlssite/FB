import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} from 'discord.js';
import { Logger } from '../../../utils/logger';

import * as panelCreate from '../handlers/panelCreate';
import * as itemAdd from '../handlers/itemAdd';
import * as itemRemove from '../handlers/itemRemove';
import * as panelList from '../handlers/panelList';
import * as panelDelete from '../handlers/panelDelete';
import * as stats from '../handlers/stats';
import * as emojiLink from '../handlers/emojiLink';
import * as emojiUnlink from '../handlers/emojiUnlink';
import * as emojiLinksList from '../handlers/emojiLinksList';

export default {
  data: new SlashCommandBuilder()
    .setName('reactions')
    .setDescription('Self-reaction role management system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    // Admin: Panel Setup
    .addSubcommandGroup(group =>
      group
        .setName('panel')
        .setDescription('Manage reaction panels')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Create a new reaction panel')
            .addStringOption(opt =>
              opt.setName('title').setDescription('Panel title').setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('description')
                .setDescription('Panel description')
                .setRequired(false)
            )
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Where to deploy the panel')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List all reaction panels')
        )
        .addSubcommand(sub =>
          sub
            .setName('delete')
            .setDescription('Delete a reaction panel')
            .addStringOption(opt =>
              opt.setName('panel_id').setDescription('Panel ID to delete').setRequired(true)
            )
        )
    )
    // Admin: Item Setup
    .addSubcommandGroup(group =>
      group
        .setName('item')
        .setDescription('Manage panel items')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Add a reaction item to a panel')
            .addStringOption(opt =>
              opt.setName('panel_id').setDescription('Panel ID').setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('emoji')
                .setDescription('Emoji for this option')
                .setRequired(true)
            )
            .addStringOption(opt =>
              opt.setName('label').setDescription('Display label').setRequired(true)
            )
            .addRoleOption(opt =>
              opt
                .setName('role')
                .setDescription('Role to assign')
                .setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('group_id')
                .setDescription('Group ID for mutual exclusivity (optional)')
                .setRequired(false)
            )
            .addBooleanOption(opt =>
              opt
                .setName('exclusive')
                .setDescription('Only one role per group?')
                .setRequired(false)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Remove a reaction item from a panel')
            .addStringOption(opt =>
              opt.setName('item_id').setDescription('Item ID to remove').setRequired(true)
            )
        )
    )
    // Admin: Emoji Link Setup
    .addSubcommandGroup(group =>
      group
        .setName('emoji')
        .setDescription('Manage emoji reaction links')
        .addSubcommand(sub =>
          sub
            .setName('link')
            .setDescription('Link an emoji reaction to a role')
            .addStringOption(opt =>
              opt.setName('message_id').setDescription('Message ID').setRequired(true)
            )
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Channel containing the message')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('emoji')
                .setDescription('Emoji to link')
                .setRequired(true)
            )
            .addRoleOption(opt =>
              opt
                .setName('role')
                .setDescription('Role to assign on reaction')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('unlink')
            .setDescription('Remove an emoji reaction link')
            .addStringOption(opt =>
              opt.setName('message_id').setDescription('Message ID').setRequired(true)
            )
            .addChannelOption(opt =>
              opt
                .setName('channel')
                .setDescription('Channel containing the message')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('emoji')
                .setDescription('Emoji to unlink')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List emoji reaction links')
            .addStringOption(opt =>
              opt
                .setName('message_id')
                .setDescription('Optional: filter by message ID')
                .setRequired(false)
            )
        )
    )
    // Admin: Stats
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('View panel statistics')
        .addStringOption(opt =>
          opt.setName('panel_id').setDescription('Panel ID (leave empty for all)').setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommandGroup === 'panel') {
        if (subcommand === 'create') {
          await panelCreate.execute(interaction);
        } else if (subcommand === 'list') {
          await panelList.execute(interaction);
        } else if (subcommand === 'delete') {
          await panelDelete.execute(interaction);
        }
      } else if (subcommandGroup === 'item') {
        if (subcommand === 'add') {
          await itemAdd.execute(interaction);
        } else if (subcommand === 'remove') {
          await itemRemove.execute(interaction);
        }
      } else if (subcommandGroup === 'emoji') {
        if (subcommand === 'link') {
          await emojiLink.execute(interaction);
        } else if (subcommand === 'unlink') {
          await emojiUnlink.execute(interaction);
        } else if (subcommand === 'list') {
          await emojiLinksList.execute(interaction);
        }
      } else if (subcommand === 'stats') {
        await stats.execute(interaction);
      }
    } catch (err) {
      Logger.error('Reaction Command Error', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred processing this command.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
