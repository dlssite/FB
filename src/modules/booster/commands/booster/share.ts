import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { BoosterService } from '../../services/BoosterService';
import { BoosterRepository } from '../../database/BoosterRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('share')
       .setDescription('🤝 Share your custom booster role with a buddy.')
       .addUserOption(opt => opt.setName('user').setDescription('The user to share your role with.').setRequired(true)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const member = interaction.member as GuildMember;

    const status = await BoosterService.getTierStatus(context.tenantId, interaction.guild.id, interaction.user.id, member);

    if (status.tier < 2) {
      return interaction.editReply(ContainerService.simple('❌ **Tier 2 Required**\nYou must be actively boosting the server 2 or more times to share your role with a buddy.', { color: 'Red' }) as any);
    }

    if (targetUser.bot) {
      return interaction.editReply(ContainerService.simple('❌ You cannot share your role with a bot.', { color: 'Red' }) as any);
    }

    const roleData = await BoosterRepository.getRole(context.tenantId, interaction.guild.id, interaction.user.id);
    if (!roleData) {
      return interaction.editReply(ContainerService.simple('❌ You need to forge a custom role first using `/booster role`.', { color: 'Red' }) as any);
    }

    const discordRole = interaction.guild.roles.cache.get(roleData.roleId);
    if (!discordRole) {
      return interaction.editReply(ContainerService.simple('❌ Your custom role appears to have been deleted. Please recreate it.', { color: 'Red' }) as any);
    }

    // Revoke from previous buddy if exists
    if (roleData.buddyId && roleData.buddyId !== targetUser.id) {
      const oldBuddy = await interaction.guild.members.fetch(roleData.buddyId).catch(() => null);
      if (oldBuddy) await oldBuddy.roles.remove(discordRole).catch(() => null);
    }

    // Assign to new buddy
    const newBuddy = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!newBuddy) {
      return interaction.editReply(ContainerService.simple('❌ Could not find that user in the server.', { color: 'Red' }) as any);
    }

    await newBuddy.roles.add(discordRole).catch(() => null);
    await BoosterRepository.linkBuddy(context.tenantId, interaction.guild.id, interaction.user.id, targetUser.id);

    await interaction.editReply(ContainerService.simple(`🤝 **Buddy Linked!**\n<@${targetUser.id}> now shares your custom role identity. They also inherit Tier 1 economy and leveling perks!`, { color: '#28C76F' }) as any);
  }
};
