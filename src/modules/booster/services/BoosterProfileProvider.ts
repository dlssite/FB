import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { BoosterService } from './BoosterService';
import { BoosterRepository } from '../database/BoosterRepository';

export class BoosterProfileProvider implements ProfileProvider {
  moduleName = 'booster';
  priority = 100; // Appears after music

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return [];

    const [status, customRole] = await Promise.all([
      BoosterService.getTierStatus(tenantId, guildId, userId),
      BoosterRepository.getRole(tenantId, guildId, userId)
    ]);

    if (status.tier === 0 && !status.isBuddy) return [
      {
        name: '🚀 Booster Ecosystem',
        value: '**Status:** *Non-Booster*\n**Custom Role:** *None*',
        inline: false
      }
    ];

    let statusStr = `**Tier ${status.tier} Booster** (\`${status.activeBoosts} active boosts\`)`;
    if (status.isBuddy) {
      statusStr = `**Buddy Booster** (Inherited from <@${status.ownerId}>)`;
    }

    let customRoleStr = '*None*';
    if (customRole) {
      customRoleStr = `<@&${customRole.roleId}>${customRole.isGrace ? ' *(Grace Period)*' : ''}`;
    }

    return [
      {
        name: '🚀 Booster Ecosystem',
        value: `**Status:** ${statusStr}\n**Custom Role:** ${customRoleStr}`,
        inline: false
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const [status, customRole] = await Promise.all([
      BoosterService.getTierStatus(tenantId, guildId, userId),
      BoosterRepository.getRole(tenantId, guildId, userId)
    ]);

    return {
      tier: status.tier,
      activeBoosts: status.activeBoosts,
      isBuddy: status.isBuddy,
      buddyOwnerId: status.ownerId || null,
      customRoleId: customRole?.roleId || null,
      isGrace: customRole?.isGrace || false
    };
  }
}
