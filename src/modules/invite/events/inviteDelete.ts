import { Events, Invite } from 'discord.js';
import { InviteTracker } from '../services/InviteTracker';
import { flamebornConfig } from '../../../config/flameborn.config';

export default {
  name: Events.InviteDelete,
  async execute(invite: Invite) {
    if (!flamebornConfig.modules.invite.active) return;
    await InviteTracker.deleteInvite(invite);
  }
};
