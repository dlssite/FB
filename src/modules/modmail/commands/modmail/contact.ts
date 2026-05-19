import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModmailService } from '../../services/ModmailService';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('contact')
       .setDescription('Open a support ticket with the server moderators')
       .addStringOption(opt => opt.setName('message').setDescription('Your message to the staff').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const message = interaction.options.getString('message', true);
    
    const success = await ModmailService.handleIncomingUserMessage(
      interaction.client,
      interaction.user,
      message,
      context.guildId,
      context.tenantId
    );

    if (success) {
      const container = ContainerService.simple('✅ Your message has been securely sent to the server staff. They will reply here in your DMs.', { color: '#2ECC71' });
      await replyV2(interaction, container);
    } else {
      const container = ContainerService.simple('❌ Modmail is currently disabled for this server, or an error occurred.', { color: '#E74C3C' });
      await replyV2(interaction, container);
    }
  }
};
