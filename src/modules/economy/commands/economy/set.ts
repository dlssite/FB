import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { EconomyService } from '../../services/EconomyService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('set')
       .setDescription('⚖️ Admin: Set a user\'s exact ember balance.')
       .addUserOption(opt => opt.setName('target').setDescription('The user to update').setRequired(true))
       .addIntegerOption(opt => opt.setName('amount').setDescription('The new balance amount').setRequired(true).setMinValue(0))
       .addStringOption(opt => opt.setName('reason').setDescription('Reason for setting balance').setRequired(true)),

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

    await EconomyService.manageBalance(context.tenantId, target.id, amount, 'set', reason);

    const response = ContainerService.create({
      title: Translator.t('economy', 'admin.set_title', lang),
      description: Translator.t('economy', 'admin.set_success', lang, { amount: amount.toLocaleString(), user: target.id }),
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
