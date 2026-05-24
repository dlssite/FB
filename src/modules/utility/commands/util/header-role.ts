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

async function fixGuildMembersWithProgress(tenantId: string, guildId: string, interaction: ChatInputCommandInteraction) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { processed: 0, errors: 0, rolesModified: 0 };
  }

  await HeaderRoleService.refreshGuild(client, tenantId, guildId);
  const groups = HeaderRoleService.getGroups(guildId);
  if (!groups.length) {
    return { processed: 0, errors: 0, rolesModified: 0 };
  }

  await guild.members.fetch().catch(() => null);
  const members = [...guild.members.cache.values()].filter(member => !member.user.bot);
  const groupCount = groups.length;
  let processedGroups = 0;
  let processedMembersInGroup = 0;
  let errors = 0;
  let rolesModified = 0;
  let lastUpdate = 0;

  const updateProgress = async (group: any | null, message: string, force = false) => {
    const groupHeader = group
      ? `**Header group:** ${processedGroups + 1}/${groupCount} — <@&${group.headerRoleId}>\n`
      : '';

    const description = `${message}\n\n${groupHeader}**Members this header:** ${processedMembersInGroup}/${members.length}\n**Headers completed:** ${processedGroups}/${groupCount}\n**Roles modified:** ${rolesModified}${errors ? `\n**Errors:** ${errors}` : ''}`;

    await replyV2(interaction, ContainerService.create({
      title: 'Header role sync',
      description,
      interaction,
      footer: true,
    }));

    interaction.replied = true;
    interaction.deferred = false;
    lastUpdate = Date.now();
  };

  console.info('[HeaderRole] Starting header role synchronization', {
    guildId,
    tenantId,
    groups: groupCount,
    members: members.length,
  });

  await updateProgress(null, `⏳ Initializing header role sync for ${members.length} member${members.length === 1 ? '' : 's'} across ${groupCount} header group${groupCount === 1 ? '' : 's'}.`, true);

  for (const group of groups) {
    processedMembersInGroup = 0;
    console.info('[HeaderRole] Processing header group', { guildId, headerRoleId: group.headerRoleId, processedGroups: processedGroups + 1, groupCount });

    await updateProgress(group, `⏳ Syncing header <@&${group.headerRoleId}> (${processedGroups + 1}/${groupCount})...`, true);

    for (const member of members) {
      processedMembersInGroup += 1;
      try {
        const currentRoleIds = new Set(member.roles.cache.keys());
        const hasChildRole = group.childRoleIds.some(id => currentRoleIds.has(id));
        const hasHeader = currentRoleIds.has(group.headerRoleId);

        if (hasChildRole && !hasHeader) {
          await member.roles.add(group.headerRoleId).catch((err) => {
            console.error(`[HeaderRole] Failed to add header role to ${member.user.tag}:`, err);
            throw err;
          });
          rolesModified += 1;
        } else if (!hasChildRole && hasHeader) {
          await member.roles.remove(group.headerRoleId).catch((err) => {
            console.error(`[HeaderRole] Failed to remove header role from ${member.user.tag}:`, err);
            throw err;
          });
          rolesModified += 1;
        }
      } catch (err) {
        errors += 1;
      }

      if (Date.now() - lastUpdate > 3000) {
        await updateProgress(group, `⏳ Syncing header <@&${group.headerRoleId}> (${processedGroups + 1}/${groupCount})...`);
      }
    }

    processedGroups += 1;
    console.info('[HeaderRole] Completed header group', { guildId, headerRoleId: group.headerRoleId, processedGroups, groupCount, rolesModified, errors });
    await updateProgress(group, `✅ Completed sync for header <@&${group.headerRoleId}>. Proceeding to next header...`, true);
  }

  console.info('[HeaderRole] Header role synchronization complete', { guildId, processedGroups, members: members.length, rolesModified, errors });
  return {
    processed: processedGroups * members.length,
    errors,
    rolesModified,
  };
}

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

    if (subcommand === 'add') {
      const headerRole = interaction.options.getRole('header', true);
      if (!headerRole || !interaction.guild) {
        await replyV2(interaction, ContainerService.simple('❌ Unable to find the selected role or guild.', { interaction }));
        return;
      }

      if (headerRole.id === interaction.guild.id) {
        await replyV2(interaction, ContainerService.simple('❌ The @everyone permission role cannot be used as a header role.', { interaction }));
        return;
      }

      await replyV2(interaction, ContainerService.create({
        title: 'Header role sync',
        description: `⏳ Adding <@&${headerRole.id}> as a header role and syncing members...`,
        interaction,
      }));
      interaction.replied = true;
      interaction.deferred = false;

      await HeaderRoleRepository.addHeaderRoleId(tenantId, guildId, headerRole.id);
      await HeaderRoleService.refreshGuild(client, tenantId, guildId);
      const { processed, errors, rolesModified } = await fixGuildMembersWithProgress(tenantId, guildId, interaction);

      await replyV2(interaction, ContainerService.simple(
        `✅ <@&${headerRole.id}> is now configured as a header role. Processed ${processed} members, **${rolesModified}** roles modified${errors ? `, ${errors} errors` : ''}.`,
        { interaction },
      ));
      return;
    }

    if (subcommand === 'remove') {
      const headerRole = interaction.options.getRole('header', true);
      if (!headerRole) {
        await replyV2(interaction, ContainerService.simple('❌ Unable to find the selected role.', { interaction }));
        return;
      }

      const current = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
      if (!current.includes(headerRole.id)) {
        await replyV2(interaction, ContainerService.simple('❌ That role is not currently configured as a header role.', { interaction }));
        return;
      }

      await HeaderRoleRepository.removeHeaderRoleId(tenantId, guildId, headerRole.id);
      await HeaderRoleService.refreshGuild(client, tenantId, guildId);

      await replyV2(interaction, ContainerService.simple(`✅ <@&${headerRole.id}> has been removed from the header-role list.`, { interaction }));
      return;
    }

    if (subcommand === 'list') {
      const configured = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
      await HeaderRoleService.refreshGuild(client, tenantId, guildId);
      const groups = HeaderRoleService.getGroups(guildId);

      if (!configured.length) {
        await replyV2(interaction, ContainerService.simple('ℹ️ No header roles are configured for this guild yet.', { interaction }));
        return;
      }

      const headerDescriptions = configured.map(headerId => {
        const role = interaction.guild?.roles.cache.get(headerId);
        const group = groups.find(g => g.headerRoleId === headerId);
        const childCount = group?.childRoleIds.length ?? 0;
        const mention = role ? `<@&${headerId}>` : `Deleted role \`${headerId}\``;
        return `• ${mention} — ${childCount} tracked role${childCount === 1 ? '' : 's'}`;
      });

      await replyV2(interaction,
        ContainerService.create({
          title: 'Configured header roles',
          description: headerDescriptions.join('\n'),
          interaction,
        }),
      );
      return;
    }

    if (subcommand === 'fix') {
      const configured = await HeaderRoleRepository.getHeaderRoleIds(tenantId, guildId);
      if (!configured.length) {
        await replyV2(interaction, ContainerService.simple('ℹ️ No header roles are configured for this guild yet.', { interaction }));
        return;
      }

      await replyV2(interaction, ContainerService.create({
        title: 'Header role sync',
        description: `⏳ Starting header role sync for all members...`,
        interaction,
      }));
      interaction.replied = true;
      interaction.deferred = false;

      const { processed, errors, rolesModified } = await fixGuildMembersWithProgress(tenantId, guildId, interaction);
      await replyV2(interaction, ContainerService.simple(
        `✅ Header role sync complete. Processed ${processed} members, **${rolesModified}** roles modified${errors ? ` with ${errors} errors` : ''}.`,
        { interaction },
      ));
      return;
    }

    await replyV2(interaction, ContainerService.simple('❌ Unknown header-role command.', { interaction }));
  },
};
