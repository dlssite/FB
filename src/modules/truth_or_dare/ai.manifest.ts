import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { TodService } from './services/TodService';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService } from '../../utils/container';
import { flamebornConfig } from '../../config/flameborn.config';

export const TodManifest: AiModuleManifest = {
  moduleName: 'TruthOrDare',
  actions: [
    {
      action: 'play_tod',
      description: 'Gets a random Truth or Dare question.',
      risk: RiskLevel.LOW,
      parameters: {
        type: { type: 'string', description: '"TRUTH" or "DARE".', required: true },
        tier: { type: 'string', description: '"SOFT", "PARTY", or "SPICY" (defaults to SOFT).', required: false }
      },
      handler: async (params, context) => {
        const { channelId } = context;
        const type = params.type.toUpperCase() as any;
        const tier = (params.tier?.toUpperCase() || 'SOFT') as any;
        
        const question = await TodService.fetchQuestion(type, tier, channelId);
        
        if (!question) return { executed: false, result: 'No questions found for that category.' };
        
        return {
          executed: true,
          result: `**${type} (${question.tier}):**\n${question.text}`
        };
      }
    },
    {
      action: 'start_tod_game',
      description: 'Starts a new multiplayer Truth or Dare game. If a userId is provided, starts a 1v1 Duel with that specific citizen. Otherwise, starts a public lobby.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The Discord ID of the specific user to duel (optional).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, guildId } = context;
        if (!interaction || !interaction.channel) {
          return { executed: false, result: 'Cannot start game: no channel context found.' };
        }

        const hostId = interaction.user.id;
        const targetId = params.userId;
        const isDuel = !!targetId;

        if (isDuel && targetId === hostId) {
          return { executed: false, result: 'You cannot duel yourself in Truth or Dare.' };
        }

        // Check for existing session
        const existing = await TodService.getSession(guildId);
        if (existing) {
          return { executed: false, result: 'A Truth or Dare session is already running in this realm. They must end it first before starting a new one.' };
        }

        // Initialize Session
        const players = isDuel ? [hostId, targetId] : [hostId];
        await TodService.startSession(guildId, hostId, players);

        // Render UI
        if (isDuel) {
          const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`tod_start_${guildId}`).setLabel('🚀 Begin Duel').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`tod_end_${guildId}`).setLabel('🛑 Cancel Duel').setStyle(ButtonStyle.Danger)
          );

          const container = ContainerService.create({
            title: '⚔️ Truth or Dare Duel',
            image: flamebornConfig.tod.assets.lobbyBanner,
            description: `**Duelists:**\n• <@${hostId}>\n• <@${targetId}>\n\nClick the button below to start the battle of wits!`,
            color: '#EA5455',
            footer: 'A duel between legends...',
            interaction: interaction as any,
            components: [controls],
            layout: 'tod'
          });

          await interaction.channel.send(container);
          return { executed: true, result: `I have initialized a Truth or Dare Duel between <@${hostId}> and <@${targetId}> in the chat. The duel panel is now active.` };
        } else {
          const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`tod_join_${guildId}`).setLabel('➕ Join Game').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`tod_leave_${guildId}`).setLabel('🚪 Leave').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`tod_start_${guildId}`).setLabel('🚀 Start Game').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`tod_end_${guildId}`).setLabel('🛑 End').setStyle(ButtonStyle.Danger)
          );

          const container = ContainerService.create({
            title: '🎮 Royal Spin — Lobby',
            image: flamebornConfig.tod.assets.lobbyBanner,
            description: `**Host:** <@${hostId}>\n\n**Players (1/10):**\n• <@${hostId}>\n\nWaiting for more players to join...`,
            color: '#7367F0',
            footer: 'Minimum 2 players required to start.',
            interaction: interaction as any,
            components: [controls],
            layout: 'tod'
          });

          await interaction.channel.send(container);
          return { executed: true, result: `I have opened a public Truth or Dare Lobby. Other citizens can now join using the panel I placed in the chat.` };
        }
      }
    }
  ]
};
