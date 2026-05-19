import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('rules')
       .setDescription('📜 Set the verification rules content')
       .addStringOption(opt => opt.setName('content').setDescription('The rules text (Markdown supported)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const rules = interaction.options.getString('content', true);
    await VerificationRepository.updateSettings(context.tenantId, context.guildId, { rulesContent: rules });
    await interaction.editReply({ content: '✅ Verification rules updated.' });
  }
};
