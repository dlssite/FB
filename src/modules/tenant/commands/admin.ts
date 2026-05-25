import {
  SlashCommandSubcommandGroupBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { TenantService } from '../../../services/TenantService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';

/**
 * Admin subcommands for tenant management
 * Requires owner permission
 */
export default {
  data: (subcommand: SlashCommandSubcommandGroupBuilder) =>
    subcommand
      .setName('admin')
      .setDescription('Administrative tenant management commands')
      .addSubcommand(sub =>
        sub
          .setName('create')
          .setDescription('Create a new tenant')
          .addStringOption(opt => opt.setName('id').setDescription('Tenant ID').setRequired(true))
          .addStringOption(opt => opt.setName('name').setDescription('Tenant name').setRequired(true))
          .addStringOption(opt => opt.setName('owner').setDescription('Owner user ID').setRequired(false))
      )
      .addSubcommand(sub =>
        sub
          .setName('setmodule')
          .setDescription('Set a module for a specific tenant')
          .addStringOption(opt => opt.setName('module').setDescription('Module name').setRequired(true))
          .addStringOption(opt => opt.setName('tenant').setDescription('Tenant ID').setRequired(true))
          .addBooleanOption(opt => opt.setName('active').setDescription('Is active?').setRequired(true))
      )
      .addSubcommand(sub =>
        sub
          .setName('setstatus')
          .setDescription('Update tenant details')
          .addStringOption(opt => opt.setName('tenant').setDescription('Tenant ID').setRequired(true))
          .addBooleanOption(opt => opt.setName('verified').setDescription('Is verified?').setRequired(false))
          .addBooleanOption(opt => opt.setName('premium').setDescription('Is premium?').setRequired(false))
          .addStringOption(opt => opt.setName('description').setDescription('Tenant description').setRequired(false))
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check if user is bot owner
    if (!flamebornConfig.owner.ids.includes(interaction.user.id)) {
      return await replyV2(
        interaction,
        ContainerService.simple('❌ Only bot owners can use admin commands', { color: '#EA5455' }),
        true
      );
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'create') {
        await handleCreate(interaction);
      } else if (subcommand === 'setmodule') {
        await handleSetModule(interaction);
      } else if (subcommand === 'setstatus') {
        await handleSetStatus(interaction);
      }
    } catch (error) {
      await replyV2(
        interaction,
        ContainerService.simple(`❌ Admin command failed: ${error}`, { color: '#EA5455' }),
        true
      );
    }
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const tenantId = interaction.options.getString('id', true);
  const name = interaction.options.getString('name', true);
  const ownerId = interaction.options.getString('owner');

  const existing = await TenantService.getTenantInfo(tenantId);
  if (existing) {
    return await replyV2(
      interaction,
      ContainerService.simple(`⚠️ Tenant \`${tenantId}\` already exists`, { color: '#FFB703' }),
      true
    );
  }

  const tenant = await TenantService.createTenant(tenantId, name, ownerId ?? undefined);

  if (!tenant) {
    return await replyV2(
      interaction,
      ContainerService.simple(`❌ Failed to create tenant`, { color: '#EA5455' }),
      true
    );
  }

  const container = ContainerService.create({
    title: '✅ Tenant Created',
    color: '#00B4DB',
    fields: [
      { name: 'ID', value: `\`${tenant.tenantId}\`` },
      { name: 'Name', value: tenant.name },
      { name: 'Owner', value: ownerId ? `<@${ownerId}>` : 'None' }
    ],
    footer: true,
  });

  await replyV2(interaction, container, true);
}

async function handleSetModule(interaction: ChatInputCommandInteraction) {
  const moduleName = interaction.options.getString('module', true);
  const tenantId = interaction.options.getString('tenant', true);
  const isActive = interaction.options.getBoolean('active', true);

  const tenant = await TenantService.getTenantInfo(tenantId);
  if (!tenant) {
    return await replyV2(
      interaction,
      ContainerService.simple(`❌ Tenant not found: \`${tenantId}\``, { color: '#EA5455' }),
      true
    );
  }

  const moduleConfig = await TenantService.setModuleTenant(moduleName, tenantId, isActive);

  const container = ContainerService.create({
    title: '✅ Module Configuration Updated',
    color: '#00B4DB',
    fields: [
      { name: 'Module', value: `\`${moduleName}\`` },
      { name: 'Tenant', value: `\`${tenantId}\`` },
      { name: 'Status', value: isActive ? '✅ Active' : '⏸️ Inactive' }
    ],
    footer: true,
  });

  await replyV2(interaction, container, true);
}

async function handleSetStatus(interaction: ChatInputCommandInteraction) {
  const tenantId = interaction.options.getString('tenant', true);
  const verified = interaction.options.getBoolean('verified');
  const premium = interaction.options.getBoolean('premium');
  const description = interaction.options.getString('description');

  const tenant = await TenantService.getTenantInfo(tenantId);
  if (!tenant) {
    return await replyV2(
      interaction,
      ContainerService.simple(`❌ Tenant not found: \`${tenantId}\``, { color: '#EA5455' }),
      true
    );
  }

  const details = {
    ...(verified !== null && { isVerified: verified }),
    ...(premium !== null && { isPremium: premium }),
    ...(description && { description }),
  };

  await TenantService.updateTenantDetails(tenantId, details);

  const container = ContainerService.create({
    title: '✅ Tenant Status Updated',
    color: '#00B4DB',
    fields: [
      { name: 'Tenant', value: `\`${tenantId}\`` },
      {
        name: 'Changes',
        value: [
          verified !== null ? `Verified: ${verified ? '✅' : '❌'}` : '',
          premium !== null ? `Premium: ${premium ? '⭐' : '❌'}` : '',
          description ? `Description: ${description}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      }
    ],
    footer: true,
  });

  await replyV2(interaction, container, true);
}
