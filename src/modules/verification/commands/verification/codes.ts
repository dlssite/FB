import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('codes')
       .setDescription('🔑 Manage verification access codes')
       .addStringOption(opt => 
         opt.setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
       )
       .addStringOption(opt => opt.setName('code').setDescription('The code to add or remove')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const action = interaction.options.getString('action', true);
    const code = interaction.options.getString('code');

    if (action === 'add') {
      if (!code) return await interaction.editReply({ content: '❌ You must provide a code to add.' });
      await VerificationRepository.addAccessCode(context.tenantId, context.guildId, code);
      return await interaction.editReply({ content: `✅ Access code \`${code}\` added successfully.` });
    }

    if (action === 'remove') {
      if (!code) return await interaction.editReply({ content: '❌ You must provide a code to remove.' });
      await VerificationRepository.deleteAccessCode(context.tenantId, context.guildId, code);
      return await interaction.editReply({ content: `✅ Access code \`${code}\` removed (if it existed).` });
    }

    if (action === 'list') {
      const codes = await VerificationRepository.getAccessCodes(context.tenantId, context.guildId);
      
      if (codes.length === 0) {
        return await interaction.editReply({ content: 'ℹ️ No access codes configured for this server.' });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔑 Active Access Codes')
        .setColor('#7367F0')
        .setDescription(codes.map(c => `• \`${c.code}\``).join('\n'))
        .setFooter({ text: `Total: ${codes.length}` });

      return await interaction.editReply({ embeds: [embed] });
    }
  }
};
