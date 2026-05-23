import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AutomodRepository } from '../../database/AutomodRepository';
import { AutomodExemptionService } from '../../services/AutomodExemptionService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('🛡️ Advanced Automod Control Panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('View & configure automod settings')
    )
    .addSubcommand(sub =>
      sub.setName('exempt')
        .setDescription('Manage exemptions for roles, channels, categories')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Action to perform')
            .addChoices(
              { name: 'Add exemption', value: 'add' },
              { name: 'Remove exemption', value: 'remove' },
              { name: 'List exemptions', value: 'list' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Type of exemption')
            .addChoices(
              { name: 'User', value: 'user' },
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' },
              { name: 'Category', value: 'category' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('target_id')
            .setDescription('The ID to exempt (required for add/remove)')
        )
        .addStringOption(opt =>
          opt.setName('reason')
            .setDescription('Reason for exemption')
        )
    )
    .addSubcommand(sub =>
      sub.setName('threshold')
        .setDescription('Configure detection thresholds')
        .addStringOption(opt =>
          opt.setName('check')
            .setDescription('Type of check to configure')
            .addChoices(
              { name: 'Spam Threshold', value: 'spam_threshold' },
              { name: 'Spam Window (ms)', value: 'spam_window' }
            )
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('value')
            .setDescription('New value')
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('modules')
        .setDescription('Enable/disable automod modules')
        .addStringOption(opt =>
          opt.setName('module')
            .setDescription('Module to configure')
            .addChoices(
              { name: 'Anti-Spam', value: 'antiSpam' },
              { name: 'Anti-Invite', value: 'antiInvite' },
              { name: 'Anti-Link', value: 'antiLink' },
              { name: 'Anti-Nuke', value: 'antiNuke' }
            )
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'config') {
      return await handleConfig(interaction, tenantId, guildId);
    } else if (subcommand === 'exempt') {
      return await handleExempt(interaction, tenantId, guildId);
    } else if (subcommand === 'threshold') {
      return await handleThreshold(interaction, tenantId, guildId);
    } else if (subcommand === 'modules') {
      return await handleModules(interaction, tenantId, guildId);
    }
  },
};

async function handleConfig(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const settings = await AutomodRepository.getSettings(tenantId, guildId);
  const enabledModules = settings?.enabledModules as Record<string, boolean> || {};

  const fields = [
    {
      name: '📊 Status',
      value: settings?.enabled ? '✅ **Enabled**' : '❌ **Disabled**',
    },
    {
      name: '⚙️ Modules',
      value: [
        `${enabledModules.antiSpam ? '✅' : '❌'} Anti-Spam`,
        `${enabledModules.antiInvite ? '✅' : '❌'} Anti-Invite`,
        `${enabledModules.antiLink ? '✅' : '❌'} Anti-Link`,
        `${enabledModules.antiNuke ? '✅' : '❌'} Anti-Nuke`,
      ].join('\n'),
    },
    {
      name: '🔧 Detection',
      value: [
        `Spam Threshold: **${settings?.spamThreshold || 5}** msgs`,
        `Spam Window: **${settings?.spamWindow || 3000}** ms`,
      ].join('\n'),
    },
    {
      name: '📝 Exemptions',
      value: `Roles: **${((settings?.exemptRoles || []) as string[]).length}** | Channels: **${((settings?.exemptChannels || []) as string[]).length}** | Categories: **${((settings?.exemptCategories || []) as string[]).length}** | Users: **${((settings?.exemptUsers || []) as string[]).length}**`,
    },
  ];

  const container = ContainerService.buildCreate({
    title: '🛡️ Automod Control Panel',
    description: 'Advanced server defense & automation system',
    fields,
    color: '#7367F0',
    footer: 'Use `/automod exempt`, `/automod threshold`, and `/automod modules` to configure',
    interaction,
  });

  await replyV2(interaction, { components: [container] });
}

async function handleExempt(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const action = interaction.options.getString('action', true);
  const type = interaction.options.getString('type', true) as 'user' | 'role' | 'channel' | 'category';
  const targetId = interaction.options.getString('target_id');
  const reason = interaction.options.getString('reason');

  if (action === 'add') {
    if (!targetId) {
      return await interaction.editReply({
        content: '❌ Please provide a target ID to exempt.',
      });
    }

    await AutomodExemptionService.addExemption(guildId, tenantId, type, targetId, reason ?? undefined);
    const container = ContainerService.buildCreate({
      title: '✅ Exemption Added',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} \`${targetId}\` is now exempt from automod.${reason ? ` Reason: ${reason}` : ''}`,
      color: '#28a745',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'remove') {
    if (!targetId) {
      return await interaction.editReply({
        content: '❌ Please provide a target ID to remove.',
      });
    }

    await AutomodExemptionService.removeExemption(guildId, tenantId, type, targetId);
    const container = ContainerService.buildCreate({
      title: '✅ Exemption Removed',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} \`${targetId}\` is no longer exempt from automod.`,
      color: '#28a745',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'list') {
    const exemptions = await AutomodExemptionService.listExemptions(guildId, tenantId, type);

    if (exemptions.length === 0) {
      const container = ContainerService.buildCreate({
        title: '📋 Exemptions List',
        description: `No exemptions of type **${type}** found.`,
        color: '#6c757d',
        interaction,
      });
      return await replyV2(interaction, { components: [container] });
    }

    const formatted = exemptions
      .map((e, i) => `${i + 1}. \`${e.targetId}\`${e.reason ? ` - ${e.reason}` : ''}`)
      .join('\n');

    const container = ContainerService.buildCreate({
      title: '📋 Exemptions List',
      description: `**${type.charAt(0).toUpperCase() + type.slice(1)}** exemptions (${exemptions.length}):`,
      fields: [{ name: 'Exemptions', value: formatted || 'None' }],
      color: '#7367F0',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }
}

async function handleThreshold(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const check = interaction.options.getString('check', true);
  const value = interaction.options.getInteger('value', true);

  const updates: any = {};
  if (check === 'spam_threshold') {
    updates.spamThreshold = value;
  } else if (check === 'spam_window') {
    updates.spamWindow = value;
  }

  await AutomodRepository.upsertSettings(tenantId, guildId, updates);

  const container = ContainerService.buildCreate({
    title: '✅ Threshold Updated',
    description: `${check === 'spam_threshold' ? 'Spam Threshold' : 'Spam Window'} set to **${value}**.`,
    color: '#28a745',
    interaction,
  });
  return await replyV2(interaction, { components: [container] });
}

async function handleModules(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const moduleName = interaction.options.getString('module', true);
  const enabled = interaction.options.getBoolean('enabled', true);

  const settings = await AutomodRepository.getSettings(tenantId, guildId);
  const enabledModules = (settings?.enabledModules || {}) as Record<string, boolean>;
  enabledModules[moduleName] = enabled;

  await AutomodRepository.upsertSettings(tenantId, guildId, { 
    enabledModules,
    ...(enabled && { enabled: true }) // Ensure top-level enabled is true when enabling any module
  });

  const moduleLabel = {
    antiSpam: 'Anti-Spam',
    antiInvite: 'Anti-Invite',
    antiLink: 'Anti-Link',
    antiNuke: 'Anti-Nuke',
  }[moduleName] || moduleName;

  const container = ContainerService.buildCreate({
    title: '✅ Module Updated',
    description: `**${moduleLabel}** is now ${enabled ? '**enabled** ✅' : '**disabled** ❌'}`,
    color: '#28a745',
    interaction,
  });
  return await replyV2(interaction, { components: [container] });
}
