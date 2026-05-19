import { SlashCommandSubcommandBuilder } from 'discord.js';
import { CountingRepository } from '../../database/CountingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcmd: SlashCommandSubcommandBuilder) =>
    subcmd
      .setName('leaderboard')
      .setDescription('View the top counters in the server'),

  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId as string;
    const guildId = interaction.guildId as string;

    const lang = interaction.locale;
    const top = await CountingRepository.getLeaderboard(tenantId, guildId);

    const fields = top.map((entry, index) => ({
      name: `${index + 1}. <@${entry.userId}>`,
      value: `**${entry.totalCounts.toLocaleString()}** Valid Counts`
    }));

    return await replyV2(interaction, ContainerService.create({
      title: Translator.t('counting', 'leaderboard.title', lang),
      description: Translator.t('counting', 'leaderboard.desc', lang),
      color: '#2ECC71',
      fields,
      interaction,
      footer: true
    }));
  }
};
