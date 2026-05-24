import {
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { HeaderRoleRepository } from '../../database/HeaderRoleRepository';
import { HeaderRoleService } from '../../services/HeaderRoleService';
import { client } from '../../../../core/FlamebornClient';

export default {
  isGroup: true,
  data: (group: SlashCommandSubcommandGroupBuilder) =>
    group
      .setName('header-role')
      .setDescription('Configure automatic header roles for role sections')
      .addSubcommand(sub =>
        sub
          .setName('add')
          .setDescription('Register a role as a header for its section')
          .addRoleOption(opt => opt.setName('header').setDescription('Role to use as the header marker').setRequired(true)),
      )
      .addSubcommand(sub =>
        sub
          .setName('remove')
          .setDescription('Remove a configured header role')
          .addRoleOption(opt => opt.setName('header').setDescription('Header role to remove').setRequired(true)),
      )
      .addSubcommand(sub =>
        sub
          .setName('list')
          .setDescription('List currently configured header roles for this guild'),
      )
      .addSubcommand(sub =>
        sub
          .setName('fix')
          .setDescription('Fix header roles for members who already joined the guild'),
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    if (subcommand === 'add') {
      const headerRole = interaction.options.getRole('header', true);
      if (!headerRole || !interaction.guild) {
        return await replyV2(interaction, ContainerService.simple('❌ Unable to find the selected role or guild.', { interaction }));
      }

      if (headerRole.id === interaction.guild.id) {
        return await replyV2(interaction, ContainerService.simple('❌ The @everyone permission role cannot be used as a header role.', { interaction }));
      }

      await HeaderRoleRepository.addHeaderRoleId(tenantId, guildId, headerRole.id);
      await HeaderRoleService.refreshGuild(client, tenantId, guildId);
      const { processed, errors } = await HeaderRoleService.fixGuildMembers(client, tenantId, guildId);

      return await replyV2(interaction, ContainerService.simple(
        `✅ <@&${headerRole.id}> is now configured as a header role and existing members have been updated. Processed ${processed} members${errors ? ` with ${errors} errors` : ''}.`,
        { interaction },
      ));
    }

    if (subcommand === 'remove') {
      const headerRole = interaction.options.getRole('header', true);
      if (!headerRole) {
        return await replyV2(interaction, ContainerService.simple('❌ Unable to find the selected role.', { interaction }));
      }

      const current = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
      if (!current.includes(headerRole.id)) {
        return await replyV2(interaction, ContainerService.simple('❌ That role is not currently configured as a header role.', { interaction }));
      }

      await HeaderRoleRepository.removeHeaderRoleId(tenantId, guildId, headerRole.id);
      await HeaderRoleService.refreshGuild(client, tenantId, guildId);

      return await replyV2(interaction, ContainerService.simple(`✅ <@&${headerRole.id}> has been removed from the header-role list.`, { interaction }));
    }

    if (subcommand === 'list') {
      const configured = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
      await HeaderRoleService.refreshGuild(client, tenantId, guildId);
      const groups = HeaderRoleService.getGroups(guildId);

      if (!configured.length) {
        return await replyV2(interaction, ContainerService.simple('ℹ️ No header roles are configured for this guild yet.', { interaction }));
      }

      const headerDescriptions = configured.map(headerId => {
        const role = interaction.guild?.roles.cache.get(headerId);
        const group = groups.find(g => g.headerRoleId === headerId);
        const childCount = group?.childRoleIds.length ?? 0;
        const mention = role ? `<@&${headerId}>` : `Deleted role \`${headerId}\``;
        return `• ${mention} — ${childCount} tracked role${childCount === 1 ? '' : 's'}`;
      });

      return await replyV2(interaction,
        ContainerService.create({
          title: 'Configured header roles',
          description: headerDescriptions.join('\n'),
          interaction,
        }),
      );
    }

    if (subcommand === 'fix') {
      const configured = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
      if (!configured.length) {
        return await replyV2(interaction, ContainerService.simple('ℹ️ No header roles are configured for this guild yet.', { interaction }));
      }

      const { processed, errors } = await HeaderRoleService.fixGuildMembers(client, tenantId, guildId);
      return await replyV2(interaction, ContainerService.simple(
        `✅ Header role sync complete. Processed ${processed} members${errors ? ` with ${errors} errors` : ''}.`,
        { interaction },
      ));
    }

    return await replyV2(interaction, ContainerService.simple('❌ Unknown header-role command.', { interaction }));
  },
};
