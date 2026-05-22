import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { AutoService, MatchType } from '../../services/AutoService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('create')
       .setDescription('➕ Create a new automated response trigger.')
       .addStringOption(opt => opt.setName('name').setDescription('A recognizable name for this trigger').setRequired(true))
       .addStringOption(opt => opt.setName('trigger').setDescription('The word or phrase to trigger on').setRequired(true))
       .addStringOption(opt => 
         opt.setName('match_type')
            .setDescription('How should the trigger match the message?')
            .setRequired(false)
            .addChoices(
              { name: 'Contains Word (Default)', value: MatchType.CONTAINS },
              { name: 'Exact Match', value: MatchType.EXACT },
              { name: 'Starts With', value: MatchType.STARTS_WITH },
              { name: 'Advanced RegEx', value: MatchType.REGEX }
            )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const name = interaction.options.getString('name', true);
    const triggerPattern = interaction.options.getString('trigger', true);
    const matchType = interaction.options.getString('match_type') || MatchType.CONTAINS;

    // Check if trigger name already exists for this guild
    const existing = await prisma.auto_triggers.findFirst({
      where: {
        tenantId: context.tenantId,
        guildId: context.guildId,
        name: name
      }
    });

    if (existing) {
      return await replyV2(interaction,
        ContainerService.create({
          title: '❌ Error',
          description: `A trigger named **${name}** already exists.`,
          color: '#EA5455',
          footer: true,
          interaction
        })
      );
    }

    // Create the trigger
    const now = new Date();
    const newTrigger = await prisma.auto_triggers.create({
      data: {
        tenantId: context.tenantId,
        guildId: context.guildId,
        name,
        trigger: triggerPattern,
        matchType,
        createdBy: interaction.user.id,
        createdAt: now
      }
    });

    // Invalidate cache
    AutoService.clearCache(context.guildId);

    const container = ContainerService.create({
      title: '✅ Auto Trigger Created',
      description: `Successfully created trigger **${name}**.\n\nNow, use \`/auto set-reply\` or \`/auto set-react\` to add actions to it!`,
      fields: [
        { name: 'Pattern', value: `\`${triggerPattern}\``, inline: true },
        { name: 'Match Type', value: `\`${matchType}\``, inline: true }
      ],
      color: '#28C76F',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
