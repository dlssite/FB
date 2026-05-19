import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationService } from '../../services/VerificationService';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('unverify')
       .setDescription('🔒 Manually unverify a user and seize their roles')
       .addUserOption(opt => opt.setName('user').setDescription('The user to unverify').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const user = interaction.options.getMember('user') as any;
    if (!user) {
      return await interaction.editReply({ content: '❌ User not found.' });
    }

    await VerificationService.seizeRoles(user, context.tenantId, context.guildId);
    await interaction.editReply({ content: `✅ User **${user.user.tag}** has been unverified and their roles seized.` });
  }
};
