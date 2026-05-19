import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { VerificationService } from '../../services/VerificationService';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('edit')
       .setDescription('🎭 Edit your server profile and roles'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    await VerificationService.sendRolesStep(interaction, context.tenantId, context.guildId);
  }
};
