import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('rank')
       .setDescription('📊 View your current neural status')
       .addUserOption(opt => opt.setName('user').setDescription('Target user')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userRecord = await LevelingRepository.getUser(context.tenantId, context.guildId, targetUser.id);

    const level = userRecord?.level || 1;
    const xp = userRecord?.xp || 0;
    const prestige = userRecord?.prestige || 0;
    const { LevelingService } = await import('../../services/LevelingService');
    const xpNeeded = LevelingService.getXpRequired(level);
    
    const rank = await LevelingRepository.getUserRank(context.tenantId, context.guildId, targetUser.id);

    // Generate Premium Canvas Card
    const { LevelingCanvasService } = await import('../../services/LevelingCanvasService');
    const buffer = await LevelingCanvasService.generateRankCard({
      username: targetUser.username,
      avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 512 }),
      level,
      xp,
      xpNeeded,
      rank,
      prestige,
      lang: context.lang
    });

    await interaction.editReply({
      files: [{ attachment: buffer, name: `rank-${targetUser.id}.png` }]
    });
  }
};
