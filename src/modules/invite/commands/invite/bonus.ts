import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { InviteRepository } from '../../database/InviteRepository';
import { InviteService } from '../../services/InviteService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('bonus')
       .setDescription('🎁 [ADMIN] Add or remove bonus invites for a user.')
       .addUserOption(opt => opt.setName('user').setDescription('The target user.').setRequired(true))
       .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to set (can be negative).').setRequired(true)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return replyV2(interaction, ContainerService.simple('❌ You need Administrator permissions to use this command.', { color: 'Red' }));
    }

    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    await InviteRepository.setBonus(context.tenantId, interaction.guild.id, targetUser.id, amount);
    
    // Sync roles immediately since their Real Invites changed
    await InviteService.syncUserRoles(context.tenantId, interaction.guild, targetUser.id);

    await replyV2(interaction, ContainerService.simple(`✅ Set bonus invites to **${amount}** for <@${targetUser.id}>. Roles have been re-evaluated.`, { color: '#28C76F' }));
  }
};
