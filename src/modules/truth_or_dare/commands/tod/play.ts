import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TodService } from '../../services/TodService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('play')
      .setDescription('🎮 Start a multiplayer Royal Spin session!')
      .addUserOption(opt => opt.setName('target').setDescription('Invite a specific user for a 1v1 Duel!')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser('target');
    const isDuel = !!target;

    if (target?.id === interaction.user.id) {
      return await interaction.reply({ content: '❌ You cannot duel yourself!', ephemeral: true });
    }
    if (target?.bot) {
      return await interaction.reply({ content: '❌ Bots cannot play Truth or Dare. They have no secrets.', ephemeral: true });
    }

    // Check if a session already exists
    const existing = await TodService.getSession(interaction.guild.id);
    if (existing) {
      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tod_resume_${interaction.guild.id}`).setLabel('➡️ Resume Lobby').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tod_end_${interaction.guild.id}`).setLabel('🛑 End Session').setStyle(ButtonStyle.Danger)
      );

      if (isDuel) {
        controls.addComponents(
          new ButtonBuilder().setCustomId(`tod_replace_duel_${target.id}`).setLabel('⚔️ Replace & Duel').setStyle(ButtonStyle.Secondary)
        );
      }

      return await replyV2(interaction, ContainerService.create({
        title: 'Session Active',
        description: `❌ A Truth or Dare session is already running in this server.\n\n${isDuel ? `To start your duel with <@${target.id}>, you must either end the current session or use **Replace & Duel**.` : 'You can resume the current lobby or end it to start fresh.'}`,
        color: '#EA5455',
        footer: true,
        interaction,
        components: [controls]
      }));
    }

    // Initialize Session
    const players = isDuel ? [interaction.user.id, target.id] : [interaction.user.id];
    const session = await TodService.startSession(interaction.guild.id, interaction.user.id, players);

    if (isDuel) {
      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tod_start_${interaction.guild.id}`).setLabel('🚀 Begin Duel').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`tod_end_${interaction.guild.id}`).setLabel('🛑 Cancel Duel').setStyle(ButtonStyle.Danger)
      );

      const container = ContainerService.create({
        title: '⚔️ Truth or Dare Duel',
        image: flamebornConfig.tod.assets.lobbyBanner,
        description: `**Duelists:**\n• <@${interaction.user.id}>\n• <@${target.id}>\n\nClick the button below to start the battle of wits!`,
        color: '#EA5455',
        footer: 'A duel between legends...',
        interaction,
        components: [controls],
        layout: 'tod'
      });

      return await replyV2(interaction, container);
    }

    // Standard Lobby logic
    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`tod_join_${interaction.guild.id}`).setLabel('➕ Join Game').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`tod_leave_${interaction.guild.id}`).setLabel('🚪 Leave').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`tod_start_${interaction.guild.id}`).setLabel('🚀 Start Game').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`tod_end_${interaction.guild.id}`).setLabel('🛑 End').setStyle(ButtonStyle.Danger)
    );

    const container = ContainerService.create({
      title: '🎮 Royal Spin — Lobby',
      image: flamebornConfig.tod.assets.lobbyBanner,
      description: `**Host:** <@${interaction.user.id}>\n\n**Players (1/10):**\n• <@${interaction.user.id}>\n\nWaiting for more players to join...`,
      color: '#7367F0',
      footer: 'Minimum 2 players required to start.',
      interaction,
      components: [controls],
      layout: 'tod'
    });

    return await replyV2(interaction, container);
  }
};
