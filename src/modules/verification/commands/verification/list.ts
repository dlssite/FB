import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('list')
       .setDescription('📊 List all verification groups and roles'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const groups = await VerificationRepository.getGroups(context.tenantId, context.guildId);
    if (groups.length === 0) {
      return await interaction.editReply({ content: 'No groups found. Start by creating one with `/verification group`.' });
    }

    let content = '# 📊 Verification Groups\n';
    groups.forEach(g => {
      content += `**#${g.id} - ${g.name}** (Header: ${g.headerRoleId ? `<@&${g.headerRoleId}>` : 'None'}, Select: ${g.minSelect}-${g.maxSelect})\n`;
      g.roles.forEach(r => {
        content += `  └ <@&${r.roleId}> - ${r.label}\n`;
      });
    });

    await interaction.editReply({ content });
  }
};
