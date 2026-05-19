import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('leaderboard')
       .setDescription('🏆 View top neural-active citizens'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const top = await LevelingRepository.getTopLevelers(context.tenantId, context.guildId, 10);
    
    if (top.length === 0) {
      return await interaction.editReply(ContainerService.simple(Translator.t('leveling', 'leaderboard.empty', lang)) as any);
    }

    const lines = top.map((u, i) => {
      const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '🔹'));
      return `**${medal}** <@${u.userId}> • **Level ${u.level}** (${u.xp.toLocaleString()} XP)`;
    }).join('\n');

    const response = ContainerService.create({
      title: Translator.t('leveling', 'leaderboard.title', lang),
      description: Translator.t('leveling', 'leaderboard.desc', lang, { lines }),
      color: '#7367F0',
      interaction,
      footer: true
    });

    await interaction.editReply(response as any);
  }
};
