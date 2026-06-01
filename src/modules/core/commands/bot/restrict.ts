import { SlashCommandSubcommandGroupBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { GuildService } from '../../../../services/GuildService';
import { getTenantContext } from '../../../../utils/context';

function parseRoleIds(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

export default {
  isGroup: true,
  data: (group: SlashCommandSubcommandGroupBuilder) =>
    group
      .setName('restrict')
      .setDescription('Configure which roles are allowed to use the bot')
      .addSubcommand(cmd =>
        cmd
          .setName('add')
          .setDescription('Grant a role permission to use the bot')
          .addRoleOption(option =>
            option
              .setName('role')
              .setDescription('The role that can use the bot')
              .setRequired(true)
          )
      )
      .addSubcommand(cmd =>
        cmd
          .setName('remove')
          .setDescription('Remove a role from bot access restrictions')
          .addRoleOption(option =>
            option
              .setName('role')
              .setDescription('The role to remove from access restrictions')
              .setRequired(true)
          )
      )
      .addSubcommand(cmd =>
        cmd
          .setName('list')
          .setDescription('View the roles that are allowed to use the bot')
      )
      .addSubcommand(cmd =>
        cmd
          .setName('clear')
          .setDescription('Remove all bot access role restrictions')
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply({
        content: '❌ You need the Manage Server permission to configure bot access restrictions.',
      });
    }

    const { tenantId, guildId } = getTenantContext();
    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole('role');

    const settings = await GuildService.getSettings(tenantId, guildId);
    const currentRoles = parseRoleIds(settings?.botAllowedRoleIds);

    if (subcommand === 'add') {
      if (!role) {
        return await interaction.editReply({ content: '❌ A role must be provided.' });
      }
      if (currentRoles.includes(role.id)) {
        return await interaction.editReply({
          content: `⚠️ The role <@&${role.id}> already has bot access.`,
        });
      }

      const updatedRoles = [...currentRoles, role.id];
      await GuildService.updateBotAllowedRoles(tenantId, guildId, updatedRoles);
      return await interaction.editReply({
        content: `✅ Role <@&${role.id}> can now use the bot.`, 
      });
    }

    if (subcommand === 'remove') {
      if (!role) {
        return await interaction.editReply({ content: '❌ A role must be provided.' });
      }
      if (!currentRoles.includes(role.id)) {
        return await interaction.editReply({
          content: `⚠️ The role <@&${role.id}> is not currently allowed to use the bot.`, 
        });
      }

      const updatedRoles = currentRoles.filter(id => id !== role.id);
      await GuildService.updateBotAllowedRoles(tenantId, guildId, updatedRoles);
      return await interaction.editReply({
        content: `✅ Role <@&${role.id}> has been removed from bot access permissions.`, 
      });
    }

    if (subcommand === 'list') {
      if (currentRoles.length === 0) {
        return await interaction.editReply({
          content: '🔓 No bot access restrictions are configured. Any user can use the bot.',
        });
      }

      return await interaction.editReply({
        content: `🔐 Allowed bot roles: ${currentRoles.map(id => `<@&${id}>`).join(', ')}`,
      });
    }

    if (subcommand === 'clear') {
      await GuildService.updateBotAllowedRoles(tenantId, guildId, []);
      return await interaction.editReply({
        content: '✅ All bot access restrictions have been cleared. Any user can use the bot again.',
      });
    }

    return await interaction.editReply({ content: '❌ Unknown bot restrict subcommand.' });
  },
};
