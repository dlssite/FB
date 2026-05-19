import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('warnings')
      .setDescription('Lists all warnings for a specific user')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to check warnings for').setRequired(true)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', true);
    const targetId = targetInput.replace(/[<@!>]/g, '');

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
      return await replyV2(interaction, ContainerService.simple('❌ Target user not found. Please mention someone or provide an ID.', { color: '#EA5455' }));
    }

    try {
      const actions = await ModerationService.getActions(tenantId, guildId, target.id);
      const warns = actions.filter(a => a.action === 'WARN');
      
      let description = 'No warnings found for this user.';
      if (warns.length > 0) {
        description = warns.map((w, i) => `**#${w.id}** | ${w.reason} (<t:${Math.floor(w.createdAt.getTime() / 1000)}:R>)`).join('\n');
      }

      await replyV2(interaction, ContainerService.create({
        title: `⚠️ Warnings: ${target.tag}`,
        description,
        color: '#FF9F43',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to fetch warnings: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
