import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('config')
       .setDescription('🛡️ Configure basic verification settings')
       .addRoleOption(opt => opt.setName('verified_role').setDescription('Role to grant upon success'))
       .addRoleOption(opt => opt.setName('unverified_role').setDescription('Role for unverified users (hides channels)'))
       .addStringOption(opt => 
         opt.setName('captcha')
            .setDescription('Captcha style')
            .addChoices(
              { name: 'None', value: 'none' },
              { name: 'Math', value: 'math' },
              { name: 'Color', value: 'color' },
              { name: 'Access Code', value: 'access_code' }
            )
       )
       .addIntegerOption(opt => opt.setName('min_age').setDescription('Min account age in days')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const verifiedRole = interaction.options.getRole('verified_role');
    const unverifiedRole = interaction.options.getRole('unverified_role');
    const captchaType = interaction.options.getString('captcha');
    const minAge = interaction.options.getInteger('min_age');

    const data: any = { enabled: true };
    if (verifiedRole) data.verifiedRoleId = verifiedRole.id;
    if (unverifiedRole) data.unverifiedRoleId = unverifiedRole.id;
    if (captchaType) data.captchaType = captchaType;
    if (minAge !== null) data.minAccountAgeDays = minAge;

    await VerificationRepository.updateSettings(context.tenantId, context.guildId, data);
    await interaction.editReply({ content: '✅ Verification config updated.' });
  }
};
