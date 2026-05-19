import { Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { TodService } from '../services/TodService';
import { TodRepository } from '../database/TodRepository';
import { ContainerService, replyV2, sendV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';

const CATEGORY_EMOJIS: any = { SOFT: '💡', PARTY: '🔥', SPICY: '🌶️' };

const TIER_MENU = (current: string) => new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('tod_level_switch')
    .setPlaceholder('Change Intensity Tier...')
    .addOptions([
      { label: 'Soft', value: 'SOFT', emoji: '💡', description: 'Family friendly and safe.', default: current === 'SOFT' },
      { label: 'Party', value: 'PARTY', emoji: '🔥', description: 'Teasing and suggestive.', default: current === 'PARTY' },
      { label: 'Spicy', value: 'SPICY', emoji: '🌶️', description: 'Adult and NSFW content.', default: current === 'SPICY' }
    ])
);

/**
 * Helper to build the requested [ Truth ] [ OR ] [ Dare ] button row.
 */
const GET_CONTROLS = (tier: string) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`tod_truth_${tier}`).setLabel('Truth').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`tod_random_${tier}`).setLabel('OR').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`tod_dare_${tier}`).setLabel('Dare').setStyle(ButtonStyle.Danger)
);

const GET_LOBBY_CONTROLS = (guildId: string) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`tod_join_${guildId}`).setLabel('➕ Join Game').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`tod_leave_${guildId}`).setLabel('🚪 Leave').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`tod_start_${guildId}`).setLabel('🚀 Start Game').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId(`tod_end_${guildId}`).setLabel('🛑 End').setStyle(ButtonStyle.Danger)
);

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    const tenantId = flamebornConfig.bot.tenant.id;
    const guildId = interaction.guildId!;

    // --- 0. SESSION MANAGEMENT ---
    if (interaction.isButton() && interaction.customId.startsWith('tod_resume_')) {
      const gid = interaction.customId.split('_')[2];
      await interaction.deferUpdate();
      
      const session = await TodService.getSession(gid);
      if (!session) return await interaction.followUp({ content: '❌ Session no longer exists.', flags: MessageFlags.Ephemeral });

      const container = ContainerService.create({
        title: '🎮 Royal Spin — Lobby (Resumed)',
        image: flamebornConfig.tod.assets.lobbyBanner,
        description: `**Host:** <@${session.hostId}>\n\n**Players (${session.players.length}/10):**\n${session.players.map((id: string) => `• <@${id}>`).join('\n')}`,
        color: '#7367F0',
        footer: 'Minimum 2 players required to start.',
        interaction,
        components: [GET_LOBBY_CONTROLS(gid)],
        layout: 'tod'
      });

      return await replyV2(interaction as any, container);
    }

    if (interaction.isButton() && interaction.customId.startsWith('tod_end_')) {
      const gid = interaction.customId.split('_')[2];
      const session = await TodService.getSession(gid);
      
      const member = interaction.member as any;
      const isAdmin = member.permissions.has('Administrator');
      
      if (session && session.hostId !== interaction.user.id && !isAdmin) {
        return await interaction.reply({ content: '❌ Only the host or an administrator can end the session!', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferUpdate();
      await TodService.endSession(gid);

      const endContainer = ContainerService.create({
        title: '🏁 Session Ended',
        description: 'The Truth or Dare session has been terminated. You can now start a new one!',
        color: '#EA5455',
        footer: true,
        interaction
      });

      return await replyV2(interaction as any, endContainer);
    }

    if (interaction.isButton() && interaction.customId.startsWith('tod_replace_duel_')) {
      const targetId = interaction.customId.split('_')[3];
      const gid = interaction.guildId!;
      
      await interaction.deferUpdate();
      await TodService.endSession(gid);
      
      const session = await TodService.startSession(gid, interaction.user.id, [interaction.user.id, targetId]);

      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tod_start_${gid}`).setLabel('🚀 Begin Duel').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`tod_end_${gid}`).setLabel('🛑 Cancel Duel').setStyle(ButtonStyle.Danger)
      );

      const duelContainer = ContainerService.create({
        title: '⚔️ Truth or Dare Duel (Replaced)',
        image: flamebornConfig.tod.assets.lobbyBanner,
        description: `Previous session ended.\n\n**Duelists:**\n• <@${interaction.user.id}>\n• <@${targetId}>\n\nClick the button below to start the battle of wits!`,
        color: '#EA5455',
        footer: 'A duel between legends...',
        interaction,
        components: [controls],
        layout: 'tod'
      });

      return await replyV2(interaction as any, duelContainer);
    }

    // --- 1. ARENA PANEL HANDLERS ---
    if (interaction.isButton() && (interaction.customId.startsWith('tod_truth_') || interaction.customId.startsWith('tod_dare_') || interaction.customId.startsWith('tod_random_'))) {
      const [_, typeRaw, currentTier] = interaction.customId.split('_');
      await interaction.deferUpdate();

      const settings = await TodRepository.getSettings(tenantId, interaction.guild.id);
      const tiers: any = { SOFT: 0, PARTY: 1, SPICY: 2 };
      
      let targetTier = currentTier as any;
      if (tiers[targetTier] > tiers[settings.maxIntensity]) {
        targetTier = settings.maxIntensity;
      }

      // Special Gating for Spicy
      if (targetTier === 'SPICY' && !(interaction.channel as any).nsfw) {
        return await interaction.followUp({ content: '❌ **Spicy** tier can only be used in NSFW-enabled channels!', flags: MessageFlags.Ephemeral });
      }

      let type = typeRaw.toUpperCase() as any;
      if (type === 'RANDOM') type = Math.random() > 0.5 ? 'TRUTH' : 'DARE';

      const question = await TodService.fetchQuestion(type, targetTier, interaction.channelId);
      if (!question) return;

      const container = ContainerService.create({
        layout: 'tod',
        title: `🎭 ${type} Challenge`,
        image: flamebornConfig.tod.assets.panelBanner,
        description: `**Question:**\n> ${question.text}`,
        color: type === 'TRUTH' ? '#7367F0' : '#EA5455',
        footer: `Challenge for ${interaction.user.username} • Tier: ${targetTier}`,
        interaction,
        components: [GET_CONTROLS(targetTier), TIER_MENU(targetTier)]
      });

      return await sendV2(interaction.channel, container);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'tod_level_switch') {
      const targetLevel = interaction.values[0];
      await interaction.deferUpdate();
      
      const container = ContainerService.create({
        layout: 'tod',
        title: '🎭 Truth or Dare Arena',
        image: flamebornConfig.tod.assets.panelBanner,
        description: `Intensity changed to **${targetLevel}**. Choose your path!`,
        color: '#7367F0',
        footer: 'Ready for the next round?',
        interaction,
        components: [GET_CONTROLS(targetLevel), TIER_MENU(targetLevel)]
      });

      return await replyV2(interaction as any, container);
    }

    // --- 2. MULTIPLAYER LOBBY HANDLERS ---
    if (interaction.isButton() && interaction.customId.startsWith('tod_join_')) {
      const guildId = interaction.customId.split('_')[2];
      await interaction.deferUpdate();

      const session = await TodService.getSession(guildId);
      if (!session) return;
      if (session.players.includes(interaction.user.id)) {
        return await interaction.followUp({ content: '❌ You are already in the lobby!', flags: MessageFlags.Ephemeral });
      }

      session.players.push(interaction.user.id);
      await TodService.updateSession(guildId, { players: session.players });

      const container = ContainerService.create({
        title: '🎮 Royal Spin — Lobby',
        image: flamebornConfig.tod.assets.lobbyBanner,
        description: `**Host:** <@${session.hostId}>\n\n**Players (${session.players.length}/10):**\n${session.players.map((id: string) => `• <@${id}>`).join('\n')}`,
        color: '#7367F0',
        footer: 'Minimum 2 players required to start.',
        interaction,
        components: [GET_LOBBY_CONTROLS(guildId)],
        layout: 'tod'
      });

      return await replyV2(interaction as any, container);
    }

    if (interaction.isButton() && interaction.customId.startsWith('tod_leave_')) {
      const guildId = interaction.customId.split('_')[2];
      await interaction.deferUpdate();

      const session = await TodService.getSession(guildId);
      if (!session) return;
      if (!session.players.includes(interaction.user.id)) {
        return await interaction.followUp({ content: '❌ You are not in this game!', flags: MessageFlags.Ephemeral });
      }

      if (session.hostId === interaction.user.id) {
        return await interaction.followUp({ content: '❌ As the host, you cannot leave. You must start or end the session!', flags: MessageFlags.Ephemeral });
      }

      session.players = session.players.filter((id: string) => id !== interaction.user.id);
      await TodService.updateSession(guildId, { players: session.players });

      const container = ContainerService.create({
        title: '🎮 Royal Spin — Lobby',
        image: flamebornConfig.tod.assets.lobbyBanner,
        description: `**Host:** <@${session.hostId}>\n\n**Players (${session.players.length}/10):**\n${session.players.map((id: string) => `• <@${id}>`).join('\n')}`,
        color: '#7367F0',
        footer: 'Minimum 2 players required to start.',
        interaction,
        components: [GET_LOBBY_CONTROLS(guildId)],
        layout: 'tod'
      });

      return await replyV2(interaction as any, container);
    }

    if (interaction.isButton() && interaction.customId.startsWith('tod_start_')) {
      const guildId = interaction.customId.split('_')[2];
      const session = await TodService.getSession(guildId);
      if (!session) return;

      const isDuel = session.players.length === 2;
      const isHost = session.hostId === interaction.user.id;
      const isPlayer = session.players.includes(interaction.user.id);

      if (!isHost && (!isDuel || !isPlayer)) {
        return await interaction.reply({ content: '❌ Only the host (or duelists) can control the game!', flags: MessageFlags.Ephemeral });
      }

      if (session.players.length < 2) {
        return await interaction.reply({ content: '❌ You need at least 2 players to start!', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferUpdate();
      await this.spinBottle(interaction, session);
    }

    // --- 3. GAMEPLAY HANDLERS (VICTIM CHOICE) ---
    if (interaction.isButton() && interaction.customId.startsWith('tod_victim_choice_')) {
      const [_, __, ___, type, guildId] = interaction.customId.split('_');
      const session = await TodService.getSession(guildId);
      if (!session || session.victimId !== interaction.user.id) return;

      await interaction.deferUpdate();

      const settings = await TodRepository.getSettings(tenantId, guildId);
      const question = await TodService.fetchQuestion(type as any, settings.maxIntensity as any, guildId);

      await TodService.updateSession(guildId, { state: 'PROPOSING', currentQuestion: question });

      const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tod_propose_${guildId}`).setLabel('✍️ Propose Question').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tod_skip_proposals_${guildId}`).setLabel('⏭️ Skip to Built-in').setStyle(ButtonStyle.Secondary)
      );

      const container = ContainerService.create({
        layout: 'tod',
        title: '🤔 Challenge Selected',
        image: flamebornConfig.tod.assets.panelBanner,
        description: `<@${interaction.user.id}> chose **${type}**!\n\n**Built-in Prompt:**\n> ${question?.text || 'None available.'}\n\nPlayers, you can now propose your own questions using the button below!`,
        color: '#7367F0',
        footer: 'Waiting for audience proposals (30s)...',
        interaction,
        components: [controls]
      });

      await replyV2(interaction as any, container);

      // --- 30 Second Timer to Auto-Reveal ---
      setTimeout(async () => {
        const currentSession = await TodService.getSession(guildId);
        if (currentSession && currentSession.state === 'PROPOSING') {
          await (this as any).revealChallenge(interaction, currentSession);
        }
      }, 30000);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('tod_skip_proposals_')) {
      const guildId = interaction.customId.split('_')[3];
      const session = await TodService.getSession(guildId);
      if (!session || session.hostId !== interaction.user.id) {
        return await interaction.reply({ content: '❌ Only the host can skip proposals!', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferUpdate();
      await this.revealChallenge(interaction, session);
    }

    // --- 4. PROPOSAL & MODAL ---
    if (interaction.isButton() && interaction.customId.startsWith('tod_propose_')) {
      const guildId = interaction.customId.split('_')[2];
      const session = await TodService.getSession(guildId);
      if (!session || session.players.includes(interaction.user.id) === false) {
        return await interaction.reply({ content: '❌ You must be in the game to propose!', flags: MessageFlags.Ephemeral });
      }
      if (session.victimId === interaction.user.id) {
        return await interaction.reply({ content: '❌ As the victim, you cannot propose your own challenge!', flags: MessageFlags.Ephemeral });
      }

      const modal = new ModalBuilder()
        .setCustomId(`tod_proposal_modal_${guildId}`)
        .setTitle('Propose a Challenge')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('proposal_text')
              .setLabel('Your Question/Dare')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('Enter your creative challenge here...')
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('tod_proposal_modal_')) {
      const guildId = interaction.customId.split('_')[3];
      const text = interaction.fields.getTextInputValue('proposal_text');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const session = await TodService.addProposal(guildId, interaction.user.id, text);
      if (!session) return;

      await interaction.editReply({ content: '✅ Your proposal has been submitted!' });
    }

    // --- 5. COMPLETION & STATS HANDLERS ---
    if (interaction.isButton() && (interaction.customId.startsWith('tod_complete_') || interaction.customId.startsWith('tod_chicken_'))) {
      const isChicken = interaction.customId.startsWith('tod_chicken_');
      const guildId = interaction.customId.split('_')[2];
      const session = await TodService.getSession(guildId);
      
      if (!session || session.victimId !== interaction.user.id) {
        return await interaction.reply({ content: '❌ Only the victim can confirm this!', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferUpdate();

      // Record Stats
      const type = isChicken ? 'CHICKEN' : session.currentType;
      await TodService.awardBravePoints(interaction.user.id, tenantId, type);

      // Track Round Progress
      const played = session.playedThisRound || [];
      if (!played.includes(interaction.user.id)) played.push(interaction.user.id);
      
      const updated = await TodService.updateSession(guildId, { playedThisRound: played, state: 'LOBBY' });
      const roundComplete = updated.playedThisRound.length === session.players.length;

      const nextControls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tod_start_${guildId}`).setLabel(roundComplete ? '🔄 Next Round' : '🌀 Spin Again').setStyle(ButtonStyle.Primary)
      );

      const container = ContainerService.create({
        layout: 'tod',
        title: isChicken ? '🐔 Cluck Cluck!' : '🏆 Bravery Recorded!',
        image: isChicken ? 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eGdzam5rZzBvY2Z6ZWZ6ZWZ6ZWZ6ZWZ6ZWZ6ZWZ6ZWZ6ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKpXX7J9Vf9Tz9q/giphy.gif' : flamebornConfig.tod.assets.selectionBanner,
        description: isChicken 
          ? `<@${interaction.user.id}> chickened out! They've been marked as a coward in the hall of shame.` 
          : `<@${interaction.user.id}> completed the challenge! They've earned Brave Points and the group's respect.`,
        color: isChicken ? '#FFA500' : '#00FF00',
        footer: roundComplete ? 'Round Complete! Everyone has played.' : `Progress: ${updated.playedThisRound.length}/${session.players.length} players have played this round.`,
        interaction,
        components: [nextControls]
      });

      return await replyV2(interaction as any, container);
    }
  },

  async spinBottle(interaction: any, session: any) {
    const guildId = interaction.guildId;
    let pPool = session.players.filter((id: string) => !(session.playedThisRound || []).includes(id));
    
    // Reset round if everyone has played
    if (pPool.length === 0) {
      pPool = session.players;
      await TodService.updateSession(guildId, { playedThisRound: [] });
    }

    const victimId = pPool[Math.floor(Math.random() * pPool.length)];
    
    await TodService.updateSession(guildId, { state: 'SPINNING', victimId });

    const containerSpin = ContainerService.create({
      title: '🌀 The Bottle is Spinning...',
      image: flamebornConfig.tod.assets.spinningBanner,
      color: '#7367F0',
      footer: 'Who will be the chosen one?',
      layout: 'tod'
    });

    await replyV2(interaction, containerSpin);

    setTimeout(async () => {
      const choiceControls = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tod_victim_choice_truth_${guildId}`).setLabel('Truth').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tod_victim_choice_dare_${guildId}`).setLabel('Dare').setStyle(ButtonStyle.Danger)
      );

      const containerResult = ContainerService.create({
        layout: 'tod',
        title: '🎯 The Chosen One!',
        image: flamebornConfig.tod.assets.selectionBanner,
        description: `The bottle pointed at <@${victimId}>!\n\nChoose your destiny...`,
        color: '#7367F0',
        footer: 'Only the selected player can choose.',
        components: [choiceControls]
      });

      await replyV2(interaction, containerResult);
    }, 3000);
  },

  async revealChallenge(interaction: any, session: any) {
    const guildId = interaction.guildId;
    let finalChallenge = session.currentQuestion?.text || 'No challenge found.';
    let source = 'Built-in Pool';

    if (session.proposals && session.proposals.length > 0) {
      const randomProposal = session.proposals[Math.floor(Math.random() * session.proposals.length)];
      finalChallenge = randomProposal.text;
      source = `Audience Proposal (by <@${randomProposal.userId}>)`;
    }

    // Reset proposals for next round
    await TodService.updateSession(guildId, { state: 'REVEALED', proposals: [], currentType: session.currentQuestion?.type || 'TRUTH' });

    const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`tod_complete_${guildId}`).setLabel('✅ Completed').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`tod_chicken_${guildId}`).setLabel('🐔 Chicken Out').setStyle(ButtonStyle.Danger)
    );

    const container = ContainerService.create({
      layout: 'tod',
      title: '🔥 The Final Verdict',
      image: flamebornConfig.tod.assets.panelBanner,
      description: `**Victim:** <@${session.victimId}>\n**Source:** ${source}\n\n**Challenge:**\n> ${finalChallenge}`,
      color: '#EA5455',
      footer: 'Waiting for victim to respond...',
      interaction,
      components: [controls]
    });

    return await replyV2(interaction, container);
  }
};
