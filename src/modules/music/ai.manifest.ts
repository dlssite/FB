import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { MusicService } from './services/MusicService';

export const MusicManifest: AiModuleManifest = {
  moduleName: 'Music',
  actions: [
    {
      action: 'play_music',
      description: 'Searches for and plays music in the current voice channel.',
      risk: RiskLevel.LOW,
      parameters: {
        query: { type: 'string', description: 'The song name or URL to play.', required: true }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        if (!interaction?.member?.voice?.channel) {
          return { executed: false, result: 'You must be in a voice channel to use music commands.' };
        }
        
        await MusicService.play(tenantId, guildId, interaction.user.id, params.query, interaction.member.voice.channel.id);
        return { executed: true, result: `Searching for and playing: **${params.query}**` };
      }
    },
    {
      action: 'skip_music',
      description: 'Skips the currently playing song.',
      risk: RiskLevel.MEDIUM,
      parameters: {},
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        await MusicService.skip(tenantId, guildId, interaction.user.id);
        return { executed: true, result: 'Skipped the current track.' };
      }
    }
  ]
};
