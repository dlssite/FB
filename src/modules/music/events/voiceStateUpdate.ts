import { Events, VoiceState } from 'discord.js';
import { MusicService } from '../services/MusicService';
import { AddonService } from '../../../services/AddonService';
import { RoutingService } from '../../../services/RoutingService';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    // Only process if guild exists
    if (!oldState.guild && !newState.guild) return;
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    // Gatekeeper Check: Is Music enabled?
    const tenantId = await RoutingService.resolveTenantId(guild.id, 'music');
    const isEnabled = await AddonService.isEnabled(tenantId, guild.id, 'music');
    if (!isEnabled) return;

    await MusicService.handleVoiceUpdate(oldState, newState);
  }
};
