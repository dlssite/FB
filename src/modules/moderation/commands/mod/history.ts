import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('history')
      .setDescription('Views the moderation history of a user')
      .addStringOption(opt => opt.setName('target').setDescription('User mention or ID to view history for').setRequired(false)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('target', false);
    let target = interaction.user;

    if (targetInput) {
      const targetId = targetInput.replace(/[<@!>]/g, '');
      const fetched = await interaction.client.users.fetch(targetId).catch(() => null);
      if (!fetched) {
        return await replyV2(interaction, ContainerService.simple('❌ Target user not found. Please mention someone or provide an ID.', { color: '#EA5455' }));
      }
      target = fetched;
    }

    try {
      const actions = await ModerationService.getActions(tenantId, guildId, target.id);
      
      let description = 'No moderation history found for this user.';
      if (actions.length > 0) {
        description = actions.map(a => `**[${a.action}]** ${a.reason} (<t:${Math.floor(a.createdAt.getTime() / 1000)}:R>)`).join('\n');
      }

      await replyV2(interaction, ContainerService.create({
        title: `📜 Mod History: ${target.tag}`,
        description,
        color: '#7367F0',
        footer: true,
        interaction
      }));
    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to fetch history: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
