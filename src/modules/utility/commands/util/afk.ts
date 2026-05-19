import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UtilityRepository } from '../../database/UtilityRepository';
import { getTenantContext } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import { ContainerService } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('afk')
      .setDescription('Sets an AFK status that notifies users who mention you')
      .addStringOption(opt => opt.setName('reason').setDescription('The reason you are going AFK')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString('reason') || 'AFK';
    const { tenantId, guildId, lang } = getTenantContext();

    await UtilityRepository.setAFK(tenantId, guildId, interaction.user.id, reason);

    await interaction.editReply(ContainerService.create({
      title: '💤 AFK Status Set',
      description: Translator.t('utility', 'afk.success', lang, { reason }),
      color: '#7367F0',
      media: [interaction.user.displayAvatarURL()],
      footer: true,
      interaction
    }));
  },
};
