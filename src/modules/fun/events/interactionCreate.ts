import { ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService, replyV2 } from '../../../utils/container';
import { RedisService } from '../../../services/RedisService';
import { Translator } from '../../../core/Translator';
import { tenantStorage } from '../../../utils/context';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: 'interactionCreate',
  async execute(interaction: ButtonInteraction) {
    try {
      if (!interaction.isButton()) return;

      const customId = interaction.customId;
      const shim = interaction as any;
      const lang = shim.lang || 'en';
      
      const guildId = interaction.guildId;
      if (!guildId) return;
      
      const { RoutingService: RS } = await import('../../../services/RoutingService');
      const tenantId = await RS.resolveTenantId(guildId, 'fun');
      
      // Gatekeeper Check: Is Fun enabled?
      const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'fun');
      if (!isEnabled) return;

      // 1. RIDDLE REVEAL HANDLER
      if (customId.startsWith('fun_riddle_')) {
        const uuid = customId.replace('fun_riddle_', '');
        
        // Defer reply ephemerally because we don't want other users to see the answer
        await interaction.deferReply({ ephemeral: true });

        const answer = await RedisService.get(`fun:riddle:${uuid}`);
        
        if (!answer) {
          return await interaction.editReply({
            content: '❌ This riddle has expired. Run `/fun riddle` to get a new one!'
          });
        }

        const embed = ContainerService.create({
          title: Translator.t('fun', 'riddle.answer_title', lang) || '💡 The Answer',
          description: `**${answer}**`,
          color: '#28C76F'
        });

        return await replyV2(interaction, embed);
      }

      // 2. TRIVIA HANDLER
      if (customId.startsWith('fun_trivia_')) {
        const parts = customId.split('_'); // ['fun', 'trivia', uuid, index]
        const uuid = parts[2];
        const selectedIndex = parseInt(parts[3], 10);

        const triviaStr = await RedisService.get(`fun:trivia:${uuid}`);
        if (!triviaStr) {
          // Trivia expired in Redis
          await interaction.deferUpdate();
          return await interaction.followUp({
            content: '❌ This trivia session has expired. Start a new one with `/fun trivia`!',
            ephemeral: true
          });
        }

        const trivia = JSON.parse(triviaStr);

        // Check if the user who clicked is the one who initiated the game
        if (interaction.user.id !== trivia.userId) {
          return await interaction.reply({
            content: '❌ You cannot answer this trivia. Type `/fun trivia` to start your own game!',
            ephemeral: true
          });
        }

        // Defer update so discord knows we received it
        await interaction.deferUpdate();

        const selectedAnswer = trivia.options[selectedIndex];
        const isCorrect = selectedAnswer === trivia.correctAnswer;

        // Build updated (disabled) buttons from the cached options
        const row = new ActionRowBuilder<ButtonBuilder>();
        trivia.options.forEach((opt: string, index: number) => {
          const isSelected = index === selectedIndex;
          const isCorrectOption = opt === trivia.correctAnswer;

          let btnStyle = ButtonStyle.Secondary;
          if (isSelected) {
            btnStyle = isCorrect ? ButtonStyle.Success : ButtonStyle.Danger;
          } else if (isCorrectOption) {
            btnStyle = ButtonStyle.Success; // Highlight the correct answer
          }

          const btn = new ButtonBuilder()
            .setCustomId(`fun_trivia_${uuid}_${index}`)
            .setLabel(opt.substring(0, 80))
            .setStyle(btnStyle)
            .setDisabled(true);

          row.addComponents(btn);
        });

        // Create result embed
        let description = '';
        if (isCorrect) {
          description = Translator.t('fun', 'trivia.correct_msg', lang) || '✅ Correct! Great job!';
        } else {
          description = Translator.t('fun', 'trivia.wrong_msg', lang, { answer: trivia.correctAnswer }) || 
            `❌ Wrong! The correct answer was **${trivia.correctAnswer}**.`;
        }

        const embed = ContainerService.create({
          title: `❓ Trivia Result: ${isCorrect ? 'SUCCESS' : 'FAILED'}`,
          description: `**Question:** ${trivia.question}\n\n${description}`,
          color: isCorrect ? '#28C76F' : '#EA5455',
          components: [row],
          footer: true,
          interaction
        });

        // Clean up from Redis so they can't double-click/hack the system
        await RedisService.del(`fun:trivia:${uuid}`);

        return await replyV2(interaction, embed);
      }

    } catch (err) {
      console.error('[FUN EVENT ERROR]', err);
    }
  }
};
