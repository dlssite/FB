import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModmailRepository } from '../../database/ModmailRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('snippet')
       .setDescription('Manage quick-reply snippets')
       .addStringOption(opt => 
         opt.setName('action')
            .setDescription('Action to perform')
            .addChoices(
              { name: 'Add / Edit', value: 'add' },
              { name: 'Delete', value: 'delete' }
            )
            .setRequired(true)
       )
       .addStringOption(opt => opt.setName('name').setDescription('Snippet name').setRequired(true))
       .addStringOption(opt => opt.setName('content').setDescription('Snippet content (Required for Add)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const action = interaction.options.getString('action', true);
    const name = interaction.options.getString('name', true).toLowerCase();
    const content = interaction.options.getString('content');

    if (action === 'add') {
      if (!content) {
        const container = ContainerService.simple('❌ Content is required when adding a snippet.', { color: '#E74C3C' });
        return await replyV2(interaction, container);
      }
      await ModmailRepository.saveSnippet(context.tenantId, context.guildId, name, content);
      const container = ContainerService.simple(`✅ Snippet \`${name}\` saved successfully.`, { color: '#2ECC71' });
      await replyV2(interaction, container);
    } else if (action === 'delete') {
      await ModmailRepository.deleteSnippet(context.tenantId, context.guildId, name);
      const container = ContainerService.simple(`🗑️ Snippet \`${name}\` deleted.`, { color: '#3498db' });
      await replyV2(interaction, container);
    }
  }
};
