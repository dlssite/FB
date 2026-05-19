import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { InviteRepository } from '../../database/InviteRepository';
import { InviteService } from '../../services/InviteService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('⚙️ [ADMIN] Configure invite module settings.')
       .addRoleOption(opt => opt.setName('top_role').setDescription('Role for the #1 Inviter.').setRequired(false))
       .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel for join/leave logs.').setRequired(false))
       .addBooleanOption(opt => opt.setName('role_stack').setDescription('Keep lower milestone roles? (Default: false)').setRequired(false)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return replyV2(interaction, ContainerService.simple('❌ You need Administrator permissions to configure this.', { color: 'Red' }));
    }

    const topRole = interaction.options.getRole('top_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const roleStack = interaction.options.getBoolean('role_stack');

    const updateData: any = {};
    if (topRole) updateData.topInviterRoleId = topRole.id;
    if (roleStack !== null) updateData.roleStack = roleStack;

    if (logChannel) {
      const { GuildService } = await import('../../../../services/GuildService');
      await GuildService.updateInviteChannel(context.tenantId, interaction.guild.id, logChannel.id);
    }

    if (Object.keys(updateData).length === 0 && !logChannel) {
      return replyV2(interaction, ContainerService.simple('❌ You must provide at least one setting to update.', { color: 'Red' }));
    }

    if (Object.keys(updateData).length > 0) {
      await InviteRepository.updateSettings(context.tenantId, interaction.guild.id, updateData);
    }
    
    // If top role changed, immediately evaluate it
    if (topRole) {
      await InviteService.evaluateTopInviter(context.tenantId, interaction.guild);
    }

    await replyV2(interaction, ContainerService.simple('✅ Invite module settings updated successfully.', { color: '#28C76F' }));
  }
};
