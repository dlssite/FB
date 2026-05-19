import { Events, VoiceState } from 'discord.js';
import { MusicService } from '../services/MusicService';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    await MusicService.handleVoiceUpdate(oldState, newState);
  }
};
