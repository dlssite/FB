import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('cancel')
       .setDescription('Silently cancel an active giveaway')
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
      const result = await GiveawayService.executeCancel(interaction.client, context.tenantId, messageId);
      if (!result.success) {
        const errMsg = Translator.t('giveaway', result.error || 'error_not_found', context.lang);
        return await replyV2(interaction, ContainerService.simple(`❌ ${errMsg}`));
      }
      const successMsg = Translator.t('giveaway', 'cancel_success', context.lang);
      return await replyV2(interaction, ContainerService.simple(`✅ ${successMsg}`));
    }

    // ── Interactive Dropdown Selection Flow ────────────────────────────
    const giveaways = await prisma.giveaways.findMany({
      where: { 
        tenantId: context.tenantId, 
        guildId: context.guildId,
        ended: { not: true }
      },
      select: { id: true, prize: true, messageId: true },
      orderBy: { id: 'desc' },
      take: 25
    });

    if (giveaways.length === 0) {
      return await replyV2(interaction, ContainerService.simple(`❌ No active giveaways found in this server.`));
    }

    const dropdown = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('giveaway_action_cancel')
        .setPlaceholder('Select an active giveaway to cancel...')
        .addOptions(
          giveaways.map(g => ({
            label: `🎁 ${g.prize.substring(0, 50)}`,
            description: `Message ID: ${g.messageId}`,
            value: g.messageId
          }))
        )
    );

    const response = ContainerService.create({
      title: '🎁 Cancel Active Giveaway',
      description: 'Please select one of the active giveaways from the dropdown list below to silently cancel it.',
      components: [dropdown],
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
