import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TerritoryRepository } from '../../territory/database/TerritoryRepository';
import { TerritoryPowerService } from '../../territory/services/TerritoryPowerService';
import { ContainerService } from '../../../utils/container';

export default {
  data: new SlashCommandBuilder()
    .setName('teleport')
    .setDescription('⚡ Instantly teleport a user to a Nation (Mod Only).')
    .addUserOption(opt => opt.setName('user').setDescription('The user to teleport').setRequired(true))
    .addStringOption(opt => opt.setName('nation').setDescription('The destination nation').setRequired(true)),

  async execute(interaction: any) {
    const { guild, member, options } = interaction;
    const targetUser = options.getUser('user', true);
    const nationName = options.getString('nation', true);
    const tenantId = interaction.tenantId || 'tenant_alpha_01';
    const guildId = guild.id;

    // 1. Permission Check (Moderator Level)
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.editReply(ContainerService.simple('❌ You do not have permission to use staff teleportation.').reply);
    }

    // 2. Resolve Nation
    const allNations = await TerritoryRepository.listByGuild(tenantId, guildId);
    const nation = allNations.find(n => n.name.toLowerCase() === nationName.toLowerCase());
    if (!nation) return interaction.editReply(ContainerService.simple(`❌ Nation **${nationName}** not found.`).reply);

    // 3. Teleport Logic
    const targetMember = await guild.members.fetch(targetUser.id);
    for (const n of allNations) {
      if (targetMember.roles.cache.has(n.roleId)) {
        await targetMember.roles.remove(n.roleId, `[Staff Teleport] Initiated by ${member.user.tag}`).catch(() => {});
      }
    }
    await targetMember.roles.add(nation.roleId, `[Staff Teleport] Initiated by ${member.user.tag}`).catch(() => {});

    // 4. Notify
    await TerritoryPowerService.logAndNotify(
      tenantId,
      member,
      targetMember,
      nation,
      'TELEPORT',
      `Staff Teleport by ${member.user.tag}`,
      null
    ).catch(() => {});

    return interaction.editReply(ContainerService.simple(`✅ Successfully teleported **${targetUser.tag}** to **${nation.name}**.`).reply);
  }
};
