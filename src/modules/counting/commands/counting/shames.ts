import { SlashCommandSubcommandBuilder } from 'discord.js';
import { CountingRepository } from '../../database/CountingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcmd: SlashCommandSubcommandBuilder) =>
    subcmd
      .setName('shames')
      .setDescription('View the users who have ruined the count the most'),

  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId as string;
    const guildId = interaction.guildId as string;

    const lang = interaction.locale;
    const shame = await CountingRepository.getShameboard(tenantId, guildId);

    const fields = shame.map((entry, index) => ({
      name: `${index + 1}. <@${entry.userId}>`,
      value: `**${entry.ruinedCounts.toLocaleString()}** Broken Chains 🤡`
    }));

    return await replyV2(interaction, ContainerService.create({
      title: Translator.t('counting', 'shames.title', lang),
      description: Translator.t('counting', 'shames.desc', lang),
      color: '#E74C3C',
      fields,
      interaction,
      footer: true
    }));
  }
};
