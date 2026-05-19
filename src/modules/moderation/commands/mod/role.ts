import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('role')
      .setDescription('Adds or removes a role from a member')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to manage roles for').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('The role to add or remove').setRequired(true)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');
    const role = interaction.options.getRole('role', true) as any;

    if (!interaction.guild) return;

    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      return await replyV2(interaction, ContainerService.simple('❌ Target member not found in this server.', { color: '#EA5455' }));
    }

    // Hierarchy check
    const botMember = interaction.guild.members.me;
    if (botMember && role.position >= botMember.roles.highest.position) {
      return await replyV2(interaction, ContainerService.simple('❌ I cannot manage this role (Role Hierarchy).', { color: '#EA5455' }));
    }

    try {
      const isAdding = !target.roles.cache.has(role.id);
      
      await ModerationService.executeAction({
        guildId,
        tenantId,
        guild: interaction.guild,
        moderator: interaction.user,
        target: target,
        action: 'ROLE',
        role: role,
        reason: `${isAdding ? 'Added' : 'Removed'} role ${role.name}`
      });

      await replyV2(interaction, ContainerService.simple(`✅ ${isAdding ? 'Added' : 'Removed'} role **${role.name}** ${isAdding ? 'to' : 'from'} **${target.user.tag}**.`, { color: '#28C76F' }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to manage roles: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
