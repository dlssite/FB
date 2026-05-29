import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('view')
       .setDescription('👁️ View the full verification system configuration'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const settings = await VerificationRepository.getSettings(context.tenantId, context.guildId);
    const groups = await VerificationRepository.getGroups(context.tenantId, context.guildId);

    const { ContainerService } = await import('../../../../utils/container');
    
    let groupsText = '### 🎭 Role Groups & Profiling\n';
    if (groups.length === 0) {
      groupsText += '*No groups configured.*';
    } else {
      groups.forEach(g => {
        groupsText += `**#${g.id} - ${g.name}**\n`;
        groupsText += `> Selection: \`${g.minSelect}-${g.maxSelect}\` | Header: ${g.headerRoleId ? `<@&${g.headerRoleId}>` : '*None*'}\n`;
        g.roles.forEach(r => {
          groupsText += `> • ${r.emoji ? r.emoji + ' ' : ''}<@&${r.roleId}> (**${r.label}**)\n`;
        });
        groupsText += '\n';
      });
    }

    // Build the description and include any configured excludes
    let descriptionText = `### ⚙️ Global Settings
**Status:** ${settings.enabled ? '✅ Enabled' : '❌ Disabled'}
**Panic Mode:** ${settings.panicMode ? '🔒 ACTIVE' : '🔓 Inactive'}
**Verified Role:** ${settings.verifiedRoleId ? `<@&${settings.verifiedRoleId}>` : '*Not Set*'}
**Unverified Role:** ${settings.unverifiedRoleId ? `<@&${settings.unverifiedRoleId}>` : '*Not Set*'}
**Captcha Type:** \`${settings.captchaType.toUpperCase()}\`
**Min Account Age:** \`${settings.minAccountAgeDays} days\``;

    try {
      const cfg = settings.panelConfig ? JSON.parse(settings.panelConfig) : {};
      const excludes = (Array.isArray(cfg.excludeRoleIds) && cfg.excludeRoleIds.length) ? (cfg.excludeRoleIds as string[]).map((id: string) => `<@&${id}>`).join(', ') : '*None*';
      const headerExcludes = (Array.isArray(cfg.excludeHeaderRoleIds) && cfg.excludeHeaderRoleIds.length) ? (cfg.excludeHeaderRoleIds as string[]).map((id: string) => `<@&${id}>`).join(', ') : '*None*';
      descriptionText += `\n\n**Preserved Roles:** ${excludes}\n**Preserved Header Roles:** ${headerExcludes}`;
    } catch (err) {
      // ignore
    }

    const containerBuilder = ContainerService.buildCreate({
      title: 'Verification System Overview',
      description: descriptionText,
      fields: [
        { name: '📜 Rules Content', value: settings.rulesContent ? settings.rulesContent.substring(0, 500) + (settings.rulesContent.length > 500 ? '...' : '') : '*Not Set*' },
        { name: '🎭 Role Groups & Profiling', value: groupsText }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, { components: [containerBuilder] });
  }
};
