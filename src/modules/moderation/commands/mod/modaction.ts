import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ModerationService } from '../../services/ModerationService';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('modaction')
      .setDescription('Views the actions performed by a specific moderator')
      .addStringOption(opt => opt.setName('moderator').setDescription('Moderator mention or ID to audit').setRequired(false)),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const targetInput = interaction.options.getString('moderator', false);
    let moderator = interaction.user;

    if (targetInput) {
      const targetId = targetInput.replace(/[<@!>]/g, '');
      const fetched = await interaction.client.users.fetch(targetId).catch(() => null);
      if (!fetched) {
        return await replyV2(interaction, ContainerService.simple('❌ Target moderator not found.', { color: '#EA5455' }));
      }
      moderator = fetched;
    }

    try {
      const actions = await ModerationService.getModeratorActions(tenantId, guildId, moderator.id);

      if (actions.length === 0) {
        return await replyV2(interaction, ContainerService.create({
          title: `🛡️ Moderator Audit: ${moderator.tag}`,
          description: 'No moderation actions found for this user.',
          color: '#28C76F',
          footer: true,
          interaction
        }));
      }

      const getActionIcon = (action: string) => {
        switch(action) {
          case 'BAN': return '🔨';
          case 'KICK': return '👢';
          case 'TIMEOUT': return '🔇';
          case 'UNTIMEOUT': return '🔊';
          case 'WARN': return '⚠️';
          case 'UNBAN': return '🔓';
          default: return '🛡️';
        }
      };

      const itemsPerPage = 5;
      const totalPages = Math.ceil(actions.length / itemsPerPage);
      let currentPage = 0;

      const generateContainer = (page: number, showButtons: boolean = true) => {
        const start = page * itemsPerPage;
        const currentActions = actions.slice(start, start + itemsPerPage);

        const historyStr = currentActions.map(a => 
          `**${getActionIcon(a.action)} [${a.action}]** against **${a.targetTag}** (${a.targetId})\nReason: ${a.reason} (<t:${Math.floor(a.createdAt.getTime() / 1000)}:R>)`
        ).join('\n\n');

        const { components } = ContainerService.create({
          title: `🛡️ Moderator Audit: ${moderator.tag}`,
          description: historyStr,
          color: '#7367F0',
          footer: `Page ${page + 1} of ${totalPages} • Total Actions (Recent): ${actions.length}`,
          interaction,
          components: (totalPages > 1 && showButtons) ? getButtons(page) : []
        });

        return { components };
      };

      function getButtons(page: number) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages - 1)
        );
        return [row];
      }

      await replyV2(interaction, generateContainer(0));
      const initialMessage = await interaction.fetchReply();

      if (totalPages > 1) {
        const collector = initialMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i: any) => {
          if (i.user.id !== interaction.user.id) {
            return await i.reply({ content: '❌ You cannot use these buttons.', ephemeral: true });
          }

          if (i.customId === 'prev_page') currentPage--;
          else if (i.customId === 'next_page') currentPage++;

          await i.update(generateContainer(currentPage));
        });

        collector.on('end', async () => {
          await replyV2(interaction, generateContainer(currentPage, false)).catch(() => {});
        });
      }

    } catch (error: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Failed to fetch moderator actions: ${error.message}`, { color: '#EA5455' }));
    }
  },
};
