import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('group')
       .setDescription('🎭 Manage role selection groups')
       .addStringOption(opt => opt.setName('name').setDescription('Group name (e.g. Regions)').setRequired(true))
       .addRoleOption(opt => opt.setName('header').setDescription('Optional header/divider role'))
       .addIntegerOption(opt => opt.setName('min').setDescription('Min roles selection (default 0)'))
       .addIntegerOption(opt => opt.setName('max').setDescription('Max roles selection (default 1)')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const name = interaction.options.getString('name', true);
    const header = interaction.options.getRole('header');
    const min = interaction.options.getInteger('min') ?? 0;
    const max = interaction.options.getInteger('max') ?? 1;

    await VerificationRepository.createGroup(context.tenantId, context.guildId, name, undefined, header?.id, min, max);
    await interaction.editReply({ content: `✅ Role group **${name}** created (Min: ${min}, Max: ${max}).` });
  }
};
