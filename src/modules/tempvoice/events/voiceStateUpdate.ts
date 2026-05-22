import { VoiceState } from 'discord.js';
import { TempVoiceService } from '../services/TempVoiceService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return; // Ignore bots

    const tenantId = flamebornConfig.bot.tenant.id;
    const guildId = member.guild.id;
    
    // Gatekeeper Check: Is Tempvoice enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'tempvoice');
    if (!isEnabled) return;

    try {
      // User Joined a Channel (or moved to a new one)
      if (newState.channelId && newState.channelId !== oldState.channelId) {
        await TempVoiceService.handleUserJoin(tenantId, member, newState);
      }

      // User Left a Channel (or moved to a new one)
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        await TempVoiceService.handleUserLeave(tenantId, member, oldState);
      }
    } catch (error) {
      Logger.error(`TempVoice Error processing voiceStateUpdate for ${member.id}`, error);
    }
  }
};
