import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { TodRepository } from '../../database/TodRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('stats')
      .setDescription('📊 View your Truth or Dare brave points and stats.')
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('The user to view stats for.')
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    const tenantId = flamebornConfig.bot.tenant.id;
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const stats = await TodRepository.getPlayerStats(targetUser.id, tenantId);

    const container = ContainerService.create({
      title: `${targetUser.username}'s Brave Profile`,
      thumbnail: targetUser.displayAvatarURL(),
      color: '#7367F0',
      fields: [
        { name: '🔥 Brave Points', value: `\`${stats.bravePoints}\`` },
        { name: '💡 Truths Answered', value: `\`${stats.truthsAnswered}\`` },
        { name: '✅ Dares Completed', value: `\`${stats.daresCompleted}\`` },
        { name: '🐔 Chickens (Refusals)', value: `\`${stats.chickens}\`` }
      ],
      footer: true,
      interaction
    });

    return await replyV2(interaction, container);
  }
};
