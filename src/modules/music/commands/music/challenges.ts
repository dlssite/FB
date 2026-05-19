import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { ChallengeService } from '../../services/ChallengeService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('challenges')
       .setDescription('🎯 View and claim rewards for music challenges.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const userId = interaction.user.id;

    const challenges = await ChallengeService.getChallenges(tenantId, guildId, userId);

    const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
    const container = new ContainerBuilder().setAccentColor(0xE74C3C);

    // 1. Header
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🎯 Symphony | Music Challenges'));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 3. Info
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('Push your musical boundaries and earn exclusive rewards! Challenges reset daily.'));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    const claimRow = new ActionRowBuilder<ButtonBuilder>();

    // 5. Dynamic Challenges
    challenges.forEach((c, index) => {
      const progress = Math.min(1, c.current / c.target);
      const barWidth = 12;
      const filledWidth = Math.floor(progress * barWidth);
      const emptyWidth = barWidth - filledWidth;
      const progressBar = '▮'.repeat(filledWidth) + '▯'.repeat(emptyWidth);
      const percentage = Math.floor(progress * 100);

      const statusEmoji = c.completed ? '✅' : '⏳';
      const colorText = c.completed ? '**Complete**' : `**${percentage}%**`;

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${statusEmoji} **${c.name}**\n*${c.description}*\n` +
        `\`${progressBar}\` ${colorText} | Reward: **${c.reward} Embers**`
      ));

      if (index < challenges.length - 1) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
      }

      if (c.completed) {
        claimRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`music_claim:${c.id}`)
            .setLabel(`Claim ${c.name}`)
            .setStyle(ButtonStyle.Success)
        );
      }
    });

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 7. Actions
    if (claimRow.components.length > 0) {
      container.addActionRowComponents(claimRow);
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 9. Footer
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `*Melody Leaderboard: Use /music leaderboard to see who's winning!*`
    ));

    await replyV2(interaction, { components: [container] });
  }
};
