import { SlashCommandSubcommandBuilder } from 'discord.js';
import { CountingRepository } from '../../database/CountingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcmd: SlashCommandSubcommandBuilder) =>
    subcmd
      .setName('stats')
      .setDescription('View counting statistics and accuracy rating for a user')
      .addUserOption(option => 
        option.setName('user').setDescription('The user to check').setRequired(false)
      ),

  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId as string;
    const guildId = interaction.guildId as string;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const lang = interaction.locale;

    const stats = await CountingRepository.getUser(tenantId, guildId, targetUser.id);
    const total = stats.totalCounts + stats.ruinedCounts;
    const accuracy = total > 0 ? ((stats.totalCounts / total) * 100).toFixed(1) : '0';

    return await replyV2(interaction, ContainerService.create({
      title: Translator.t('counting', 'stats.title', lang, { user: targetUser.username }),
      description: Translator.t('counting', 'stats.desc', lang),
      color: '#F1C40F',
      thumbnail: targetUser.displayAvatarURL(),
      fields: [
        { name: '✅ Successful Counts', value: stats.totalCounts.toLocaleString() },
        { name: '❌ Ruins Caused', value: stats.ruinedCounts.toLocaleString() },
        { name: '🎯 Accuracy Rating', value: `${accuracy}%` },
        { name: '⏳ Saves Triggered', value: stats.savesUsed.toLocaleString() }
      ],
      interaction,
      footer: true
    }));
  }
};
