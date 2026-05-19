import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('remove')
       .setDescription('✂️ Admin: Deduct embers from a user.')
       .addUserOption(opt => opt.setName('target').setDescription('The user to lose embers').setRequired(true))
       .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of embers to remove').setRequired(true).setMinValue(1))
       .addStringOption(opt => opt.setName('reason').setDescription('Reason for removing embers').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(
        interaction,
        ContainerService.simple(Translator.t('economy', 'admin.no_permission', lang))
      );
    }

    const target = interaction.options.getUser('target', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason', true);

    await EconomyService.manageBalance(context.tenantId, target.id, amount, 'remove', reason);

    const response = ContainerService.create({
      title: Translator.t('economy', 'admin.remove_title', lang),
      description: Translator.t('economy', 'admin.remove_success', lang, { amount: amount.toLocaleString(), user: target.id }),
      color: '#EA5455',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
