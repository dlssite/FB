import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { ApiKeyManager } from '../../services/ApiKeyManager';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('stats')
       .setDescription('View the health and usage statistics of the AI API keys (Bot Owner only)'),

  async execute(interaction: ChatInputCommandInteraction) {
    // Access Control: Bot Owners only
    if (!flamebornConfig.owner.ids.includes(interaction.user.id)) {
      await interaction.editReply({ content: "❌ You do not have permission to view AI API statistics." });
      return;
    }

    const stats = ApiKeyManager.getStats();

    const formatProvider = (data: any) => {
      return `**Active Keys**: ${data.active}\n**Rate Limited**: ${data.limited}\n**Dead (401)**: ${data.dead}\n**Total Requests**: ${data.totalRequests}\n**Total Fails**: ${data.totalFails}`;
    };

    const containerPayload = ContainerService.create({
      title: 'Cognitive Engine: API Statistics',
      description: 'Real-time health and rotation statistics for the AI LLM providers.',
      color: '#7367F0',
      fields: [
        { name: 'OpenRouter (Primary)', value: formatProvider(stats.openrouter) }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, containerPayload);
  }
};
