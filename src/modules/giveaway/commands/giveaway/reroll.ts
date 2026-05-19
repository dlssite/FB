import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('reroll')
       .setDescription('Reroll an ended giveaway')
       .addStringOption(opt =>
         opt.setName('message_id')
            .setDescription('Optional giveaway message ID to execute immediately')
            .setRequired(false)
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const messageId = interaction.options.getString('message_id', false);

    // ── Direct Execution Flow ──────────────────────────────────────────
    if (messageId) {
      const result = await GiveawayService.executeReroll(interaction.client, context.tenantId, messageId);
      if (!result.success) {
        const errMsg = Translator.t('giveaway', result.error || 'error_not_found', context.lang);
        return await replyV2(interaction, ContainerService.simple(`❌ ${errMsg}`));
      }
      const successMsg = Translator.t('giveaway', 'reroll_success', context.lang);
      return await replyV2(interaction, ContainerService.simple(`✅ ${successMsg}`));
    }

    // ── Interactive Dropdown Selection Flow ────────────────────────────
    const giveaways = await prisma.giveaways.findMany({
      where: { 
        tenantId: context.tenantId, 
        guildId: context.guildId,
        ended: true
      },
      select: { id: true, prize: true, messageId: true },
      orderBy: { id: 'desc' },
      take: 25
    });

    if (giveaways.length === 0) {
      return await replyV2(interaction, ContainerService.simple(`❌ No ended giveaways found in this server.`));
    }

    const dropdown = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('giveaway_action_reroll')
        .setPlaceholder('Select an ended giveaway to reroll...')
        .addOptions(
          giveaways.map(g => ({
            label: `🎁 ${g.prize.substring(0, 50)}`,
            description: `Message ID: ${g.messageId}`,
            value: g.messageId
          }))
        )
    );

    const response = ContainerService.create({
      title: '🎁 Reroll Ended Giveaway',
      description: 'Please select one of the ended giveaways from the dropdown list below to reroll a new winner.',
      components: [dropdown],
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
