import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ModmailRepository } from '../../database/ModmailRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('setup_category')
       .setDescription('Map an AI Triage category to a Ping Role')
       .addStringOption(opt => 
          opt.setName('name')
             .setDescription('Category Name (e.g., Billing, Report, Bug Report, Appeal)')
             .setRequired(true)
       )
       .addRoleOption(opt => opt.setName('ping_role').setDescription('Role to ping for this category').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
       const container = ContainerService.simple('❌ You do not have permission to configure Modmail.', { color: '#E74C3C' });
       return await replyV2(interaction, container);
    }

    const name = interaction.options.getString('name', true);
    const role = interaction.options.getRole('ping_role', true);

    await ModmailRepository.saveCategory(context.tenantId, context.guildId, name, role.id);
    const container = ContainerService.simple(`✅ The **${name}** category will now ping <@&${role.id}>.`, { color: '#2ECC71' });
    await replyV2(interaction, container);
  }
};
