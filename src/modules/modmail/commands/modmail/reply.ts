import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModmailRepository } from '../../database/ModmailRepository';
import { ModmailService } from '../../services/ModmailService';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('reply')
       .setDescription('Reply to the user in this Modmail thread')
       .addStringOption(opt => opt.setName('message').setDescription('Your message to the user').setRequired(false))
       .addStringOption(opt => 
         opt.setName('snippet')
            .setDescription('Use a pre-saved snippet/macro')
            .setRequired(false)
            .setAutocomplete(true)
       )
       .addStringOption(opt => 
         opt.setName('identity')
            .setDescription('Who are you replying as?')
            .addChoices(
              { name: 'Your Name (Default)', value: 'user' },
              { name: 'Staff Member (Anonymous)', value: 'Staff Member' },
              { name: 'The Bot', value: 'Flameborn System' }
            )
            .setRequired(false)
       ),

  async autocomplete(interaction: any) {
    const context = tenantStorage.getStore();
    if (!context) return;
    // Autocomplete for snippets
    // (Implementation skipped for brevity, but would fetch from ModmailRepository.getSnippets)
    await interaction.respond([]);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    // Must be in a thread
    if (!interaction.channel?.isThread()) {
      const container = ContainerService.simple('❌ You must use this command inside a Modmail thread.', { color: '#E74C3C' });
      return await replyV2(interaction, container);
    }

    const ticket = await ModmailRepository.getTicketByThread(context.tenantId, interaction.channel.id);
    if (!ticket || ticket.status === 'closed') {
      const container = ContainerService.simple('❌ This thread is not an active Modmail ticket.', { color: '#E74C3C' });
      return await replyV2(interaction, container);
    }

    // Check claiming
    if (ticket.claimedById && ticket.claimedById !== interaction.user.id) {
      const container = ContainerService.simple(`❌ This ticket is claimed by <@${ticket.claimedById}>.`, { color: '#E74C3C' });
      return await replyV2(interaction, container);
    }

    let message = interaction.options.getString('message');
    const snippetName = interaction.options.getString('snippet');
    const identityOpt = interaction.options.getString('identity');

    if (!message && !snippetName) {
      const container = ContainerService.simple('❌ You must provide either a message or a snippet.', { color: '#E74C3C' });
      return await replyV2(interaction, container);
    }

    if (snippetName && !message) {
      const snippet = await ModmailRepository.getSnippet(context.tenantId, context.guildId, snippetName);
      if (snippet) {
        message = snippet.content;
      } else {
        const container = ContainerService.simple(`❌ Snippet \`${snippetName}\` not found.`, { color: '#E74C3C' });
        return await replyV2(interaction, container);
      }
    }

    const maskedIdentity = identityOpt === 'user' || !identityOpt ? null : identityOpt;
    
    await ModmailService.handleOutgoingModMessage(interaction.client, ticket, interaction.user, message!, maskedIdentity);

    const container = ContainerService.simple('✅ Reply sent.', { color: '#2ECC71' });
    await replyV2(interaction, container);
  }
};
