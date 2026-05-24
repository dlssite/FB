import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { AutomodRepository } from '../../database/AutomodRepository';
import { AutomodExemptionService } from '../../services/AutomodExemptionService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

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
    )
    .addSubcommand(sub =>
      sub.setName('punishments')
        .setDescription('Configure escalating punishments for violations')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Action to perform')
            .addChoices(
              { name: 'View punishments', value: 'view' },
              { name: 'Set punishment', value: 'set' },
              { name: 'Reset to default', value: 'reset' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('module')
            .setDescription('Module to configure (required for set/reset)')
            .addChoices(
              { name: 'Anti-Spam', value: 'antiSpam' },
              { name: 'Anti-Invite', value: 'antiInvite' },
              { name: 'Anti-Link', value: 'antiLink' },
              { name: 'Anti-Nuke', value: 'antiNuke' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('violations')
            .setDescription('Violation count to trigger punishment')
            .setMinValue(1)
        )
        .addStringOption(opt =>
          opt.setName('punishment')
            .setDescription('Punishment action')
            .addChoices(
              { name: 'Delete (always)', value: 'delete' },
              { name: 'Warn', value: 'warn' },
              { name: 'Mute', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('duration')
            .setDescription('Duration in seconds (for mute/timeout)')
            .setMinValue(60)
        )
    )
    .addSubcommand(sub =>
      sub.setName('violations')
        .setDescription('Manage user violation counters')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Action to perform')
            .addChoices(
              { name: 'View violations', value: 'view' },
              { name: 'Reset user', value: 'reset' },
              { name: 'Reset all', value: 'reset_all' }
            )
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to view/reset (required for view/reset)')
        )
    )
    .addSubcommand(sub =>
      sub.setName('whitelist')
        .setDescription('Manage automod whitelists for links and invites')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Action to perform')
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Whitelist type')
            .addChoices(
              { name: 'Link', value: 'link' },
              { name: 'Invite', value: 'invite' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('Value to add/remove (url or domain)')
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
    } else if (subcommand === 'punishments') {
      return await handlePunishments(interaction, tenantId, guildId);
    } else if (subcommand === 'violations') {
      return await handleViolations(interaction, tenantId, guildId);
    } else if (subcommand === 'whitelist') {
      return await handleWhitelist(interaction, tenantId, guildId);
    }
  },
};

async function handleWhitelist(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const action = interaction.options.getString('action', true);
  const type = interaction.options.getString('type', true) as 'link' | 'invite';
  const value = interaction.options.getString('value');

  const settings = await AutomodRepository.getSettings(tenantId, guildId) || {};
  const linkWhitelist = Array.isArray(settings.linkWhitelist) ? settings.linkWhitelist.slice() : [];
  const inviteWhitelist = Array.isArray(settings.inviteWhitelist) ? settings.inviteWhitelist.slice() : [];

  const save = async () => {
    await AutomodRepository.updateSettings(tenantId, guildId, {
      linkWhitelist,
      inviteWhitelist,
    }).catch(async () => {
      await AutomodRepository.upsertSettings(tenantId, guildId, { linkWhitelist, inviteWhitelist });
    });
  };

  if (action === 'add') {
    if (!value) {
      const container = ContainerService.buildCreate({ title: '❌ Error', description: 'You must provide a value to add', color: '#dc3545', interaction });
      return await replyV2(interaction, { components: [container] });
    }
    const list = type === 'link' ? linkWhitelist : inviteWhitelist;
    if (list.includes(value)) {
      const container = ContainerService.buildCreate({ title: 'ℹ️ Already Present', description: `${type} whitelist already contains that value.`, color: '#6c757d', interaction });
      return await replyV2(interaction, { components: [container] });
    }
    list.push(value);
    await save();
    const container = ContainerService.buildCreate({ title: '✅ Whitelist Updated', description: `Added **${value}** to ${type} whitelist.`, color: '#28a745', interaction });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'remove') {
    if (!value) {
      const container = ContainerService.buildCreate({ title: '❌ Error', description: 'You must provide a value to remove', color: '#dc3545', interaction });
      return await replyV2(interaction, { components: [container] });
    }
    const list = type === 'link' ? linkWhitelist : inviteWhitelist;
    const idx = list.indexOf(value);
    if (idx === -1) {
      const container = ContainerService.buildCreate({ title: 'ℹ️ Not Found', description: `${type} whitelist does not contain that value.`, color: '#6c757d', interaction });
      return await replyV2(interaction, { components: [container] });
    }
    list.splice(idx, 1);
    await save();
    const container = ContainerService.buildCreate({ title: '✅ Whitelist Updated', description: `Removed **${value}** from ${type} whitelist.`, color: '#28a745', interaction });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'list') {
    const list = type === 'link' ? linkWhitelist : inviteWhitelist;
    const container = ContainerService.buildCreate({ title: `📋 ${type.charAt(0).toUpperCase() + type.slice(1)} Whitelist`, description: list.length ? list.map((v: string, i: number) => `${i+1}. ${v}`).join('\n') : 'No entries', color: '#7367F0', interaction });
    return await replyV2(interaction, { components: [container] });
  }
}

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
    footer: '⚠️ Make sure automod addon is enabled first via `/togglemodule automod enabled:true`. Then use `/automod modules` to enable specific checks.',
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
    description: `**${moduleLabel}** is now ${enabled ? '**enabled** ✅' : '**disabled** ❌'}\n\n⚠️ **Important:** Make sure the automod addon itself is enabled via \`/togglemodule automod enabled:true\``,
    color: '#28a745',
    interaction,
  });
  return await replyV2(interaction, { components: [container] });
}

async function handlePunishments(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const action = interaction.options.getString('action', true);
  const moduleName = interaction.options.getString('module');
  const violations = interaction.options.getInteger('violations');
  const punishment = interaction.options.getString('punishment');
  const duration = interaction.options.getInteger('duration');

  const settings = await AutomodRepository.getSettings(tenantId, guildId);
  let punishmentConfig = settings?.punishmentConfig ? JSON.parse(settings.punishmentConfig as any) : {};

  if (action === 'view') {
    const fields = [];
    const defaultConfig = {
      antiSpam: {
        windowMs: 86400000,
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 3, action: 'warn', duration: null },
          { violations: 5, action: 'mute', duration: 300 },
          { violations: 10, action: 'kick', duration: null },
        ],
      },
      antiInvite: {
        windowMs: 86400000,
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 2, action: 'warn', duration: null },
          { violations: 4, action: 'mute', duration: 600 },
          { violations: 6, action: 'kick', duration: null },
        ],
      },
      antiLink: {
        windowMs: 86400000,
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 3, action: 'warn', duration: null },
          { violations: 5, action: 'mute', duration: 900 },
          { violations: 8, action: 'kick', duration: null },
        ],
      },
      antiNuke: {
        windowMs: 3600000,
        escalation: [
          { violations: 1, action: 'delete', duration: null },
          { violations: 1, action: 'warn', duration: null },
          { violations: 2, action: 'kick', duration: null },
        ],
      },
    };

    for (const [mod, config] of Object.entries(defaultConfig)) {
      const customConfig = punishmentConfig[mod] || config;
      const escalationStr = customConfig.escalation
        .map((e: any) => `**${e.violations}** violation(s) → ${e.action}${e.duration ? ` (${e.duration}s)` : ''}`)
        .join('\n');

      fields.push({
        name: `${mod.charAt(0).toUpperCase() + mod.slice(1)} Escalation`,
        value: escalationStr || 'No escalation configured',
      });
    }

    const container = ContainerService.buildCreate({
      title: '⚙️ Punishment Configuration',
      fields,
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'reset') {
    if (!moduleName) {
      const container = ContainerService.buildCreate({
        title: '❌ Error',
        description: 'You must specify a module to reset',
        color: '#dc3545',
        interaction,
      });
      return await replyV2(interaction, { components: [container] });
    }

    delete punishmentConfig[moduleName];
    await AutomodRepository.updateSettings(tenantId, guildId, {
      punishmentConfig: JSON.stringify(punishmentConfig),
    });

    const container = ContainerService.buildCreate({
      title: '✅ Reset Complete',
      description: `**${moduleName}** punishment configuration reset to defaults`,
      color: '#28a745',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'set') {
    if (!moduleName || !violations || !punishment) {
      const container = ContainerService.buildCreate({
        title: '❌ Error',
        description: 'You must specify module, violations, and punishment',
        color: '#dc3545',
        interaction,
      });
      return await replyV2(interaction, { components: [container] });
    }

    if (!punishmentConfig[moduleName]) {
      punishmentConfig[moduleName] = { windowMs: 86400000, escalation: [] };
    }

    const escalation = punishmentConfig[moduleName].escalation || [];
    const existingIndex = escalation.findIndex((e: any) => e.violations === violations);

    const newEscalation = {
      violations,
      action: punishment,
      duration: duration || null,
    };

    if (existingIndex >= 0) {
      escalation[existingIndex] = newEscalation;
    } else {
      escalation.push(newEscalation);
      escalation.sort((a: any, b: any) => a.violations - b.violations);
    }

    punishmentConfig[moduleName].escalation = escalation;

    await AutomodRepository.updateSettings(tenantId, guildId, {
      punishmentConfig: JSON.stringify(punishmentConfig),
    });

    const container = ContainerService.buildCreate({
      title: '✅ Punishment Updated',
      description: `**${moduleName}** at **${violations}** violation(s) → **${punishment}**${duration ? ` (${duration}s)` : ''}`,
      color: '#28a745',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }
}

async function handleViolations(interaction: ChatInputCommandInteraction, tenantId: string, guildId: string) {
  const action = interaction.options.getString('action', true);
  const user = interaction.options.getUser('user');

  if (action === 'view') {
    if (!user) {
      const container = ContainerService.buildCreate({
        title: '❌ Error',
        description: 'You must specify a user to view violations',
        color: '#dc3545',
        interaction,
      });
      return await replyV2(interaction, { components: [container] });
    }

    const violations = await AutomodRepository.getUserViolations(guildId, tenantId, user.id, 50);
    
    const violationsByType: Record<string, number> = {};
    violations.forEach((v: any) => {
      violationsByType[v.violationType] = (violationsByType[v.violationType] || 0) + 1;
    });

    const description = Object.entries(violationsByType)
      .map(([type, count]) => `**${type}**: ${count} violation(s)`)
      .join('\n') || 'No violations';

    const container = ContainerService.buildCreate({
      title: `📊 Violations for ${user.tag}`,
      description,
      color: '#ffc107',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'reset') {
    if (!user) {
      const container = ContainerService.buildCreate({
        title: '❌ Error',
        description: 'You must specify a user to reset',
        color: '#dc3545',
        interaction,
      });
      return await replyV2(interaction, { components: [container] });
    }

    const deleted = await AutomodRepository.resetViolationCounter(guildId, tenantId, user.id);
    
    const container = ContainerService.buildCreate({
      title: '✅ Reset Complete',
      description: `All violation counters reset for **${user.tag}** (${deleted} records deleted)`,
      color: '#28a745',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }

  if (action === 'reset_all') {
    await (prisma as any).automod_violation_counters.deleteMany({
      where: { guildId, tenantId },
    });

    const container = ContainerService.buildCreate({
      title: '✅ Reset Complete',
      description: 'All violation counters reset for this server',
      color: '#28a745',
      interaction,
    });
    return await replyV2(interaction, { components: [container] });
  }
}
