import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { BoosterService } from '../../services/BoosterService';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('role')
       .setDescription('🎨 Create or edit your custom booster role.')
       .addStringOption(opt => opt.setName('name').setDescription('The name of your custom role.').setRequired(true))
       .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g., #FF5555).').setRequired(true)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    const name = interaction.options.getString('name', true);
    let color = interaction.options.getString('color', true);

    if (!color.startsWith('#')) color = '#' + color;
    const hexRegex = /^#([A-Fa-f0-9]{6})$/;
    if (!hexRegex.test(color)) {
      return interaction.editReply(ContainerService.simple('❌ Invalid hex color provided. Use format: #FFFFFF', { color: 'Red' }) as any);
    }

    const member = interaction.member as GuildMember;
    const status = await BoosterService.getTierStatus(context.tenantId, interaction.guild.id, interaction.user.id, member);

    if (status.tier < 2) {
      return interaction.editReply(ContainerService.simple('❌ **Tier 2 Required**\nYou must be actively boosting the server 2 or more times to forge a custom identity.', { color: 'Red' }) as any);
    }

    try {
      const result = await BoosterService.forgeCustomRole(context.tenantId, interaction.guild, interaction.user.id, name, color);
      
      const actionText = result.action === 'created' ? 'forged' : 'updated';
      await interaction.editReply(ContainerService.simple(`✨ **Identity ${actionText}!**\nYour custom role <@&${result.roleId}> has been synchronized to the ecosystem.`, { color: color }) as any);
    } catch (err) {
      console.error(err);
      await interaction.editReply(ContainerService.simple('❌ An error occurred while managing your role. Make sure the bot has permissions to create roles.', { color: 'Red' }) as any);
    }
  }
};
