import { Events, GuildMember } from 'discord.js';
import { VerificationRepository } from '../database/VerificationRepository';
import { VerificationService } from '../services/VerificationService';
import { tenantStorage } from '../../../utils/context';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember) {
    const guildId = member.guild.id;
    
    // Resolve context for verification module
    const tenantId = await RoutingService.resolveTenantId(guildId, 'verification');
    
    // Gatekeeper Check: Is Verification enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'verification');
    if (!isEnabled) return;
    
    await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
      const settings = await VerificationRepository.getSettings(tenantId, guildId);
      
      if (settings && settings.enabled && settings.unverifiedRoleId) {
        // Apply the unverified role immediately
        await VerificationService.seizeRoles(member, tenantId, guildId);
      }
    });
  }
};
