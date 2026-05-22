import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('list')
       .setDescription('📜 View all active automated triggers in this server.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const triggers = await prisma.auto_triggers.findMany({
      where: { tenantId: context.tenantId, guildId: context.guildId }
    });

    if (triggers.length === 0) {
      return await replyV2(interaction,
        ContainerService.create({
          title: 'ℹ️ Info',
          description: 'No automated triggers have been set up for this server.',
          color: '#7367F0',
          footer: true,
          interaction
        })
      );
    }

    const triggerList = triggers.map(t => {
      const reactions = t.reactions as string[];
      const replies = t.replyTexts as string[];
      
      let summary = `**${t.name}** \`[${t.matchType}]\`\n`;
      summary += `└ Trigger: \`${t.trigger}\`\n`;
      
      if (reactions.length > 0) summary += `└ Reacts: ${reactions.join(' ')}\n`;
      if (replies.length > 0) summary += `└ Replies: ${replies.length} variant(s)\n`;
      if (t.chance < 100) summary += `└ Chance: ${t.chance}%\n`;
      if (t.cooldown > 0) summary += `└ Cooldown: ${t.cooldown}s\n`;
      
      return summary;
    }).join('\n');

    // Handle large payloads (split or truncate if necessary)
    const displayList = triggerList.length > 2000 ? triggerList.substring(0, 1997) + '...' : triggerList;

    const container = ContainerService.create({
      title: '📜 Unified Action Engine Roster',
      description: `Active Triggers: **${triggers.length}**\n\n${displayList}`,
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
