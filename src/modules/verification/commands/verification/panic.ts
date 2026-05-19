import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction, 
  MessageFlags
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('panic')
       .setDescription('🛡️ Toggle Panic Mode (Lockdown the server gate)')
       .addBooleanOption(opt => opt.setName('active').setDescription('Enable or disable Panic Mode').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const active = interaction.options.getBoolean('active', true);

    await VerificationRepository.updateSettings(context.tenantId, context.guildId, { panicMode: active });
    
    const status = active ? '🔒 **ACTIVATED** (Gate Locked)' : '🔓 **DEACTIVATED** (Gate Open)';
    await interaction.editReply({ 
      content: `### 🚨 Panic Mode ${status}\nVerification has been ${active ? 'disabled' : 'enabled'} for all users.`
    });
  }
};
