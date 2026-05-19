import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('test')
      .setDescription('Test the welcome message'),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId } = getTenantContext();
    
    // Dynamic import to avoid circular dependencies
    const { WelcomeService } = await import('../../services/WelcomeService');
    await WelcomeService.handleJoin(interaction.member as any, tenantId);
    
    return await interaction.editReply({ content: '✅ Test message sent!' });
  },
};
