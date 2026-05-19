import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('role')
       .setDescription('➕ Add a role to a selection group')
       .addIntegerOption(opt => opt.setName('group_id').setDescription('ID of the group (use /verification list)').setRequired(true))
       .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
       .addStringOption(opt => opt.setName('label').setDescription('Label for the dropdown').setRequired(true))
       .addStringOption(opt => opt.setName('emoji').setDescription('Emoji for the dropdown'))
       .addStringOption(opt => opt.setName('description').setDescription('Description for the dropdown')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const groupId = interaction.options.getInteger('group_id', true);
    const role = interaction.options.getRole('role', true);
    const label = interaction.options.getString('label', true);
    const emoji = interaction.options.getString('emoji');
    const description = interaction.options.getString('description');

    const group = await VerificationRepository.getGroupById(groupId);
    if (!group) {
      return await interaction.editReply({ content: '❌ Group not found. Use `/verification list` to see valid IDs.' });
    }

    await VerificationRepository.addRoleToGroup(groupId, role.id, label, emoji || undefined, description || undefined);
    await interaction.editReply({ content: `✅ Role <@&${role.id}> added to group **${group.name}**.` });
  }
};
