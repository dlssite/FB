import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('reset')
       .setDescription('🛠️ Admin: Reset server leveling XP, levels, and prestige')
       .addBooleanOption(opt => opt.setName('confirm').setDescription('Confirm resetting all server leveling progress').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('leveling', 'admin.no_permission', lang)));
    }

    const confirm = interaction.options.getBoolean('confirm', true);
    if (!confirm) {
      return await replyV2(interaction, ContainerService.simple('❌ Reset cancelled. To reset server leveling progress, set confirm to true.'));
    }

    const result = await LevelingRepository.resetGuild(context.tenantId, context.guildId);
    const total = result.count || 0;

    const response = ContainerService.create({
      title: Translator.t('leveling', 'admin.reset_success', lang),
      description: Translator.t('leveling', 'admin.reset_desc', lang),
      color: '#28C76F',
      interaction,
      footer: true
    });

    await replyV2(interaction, response);
  }
};
