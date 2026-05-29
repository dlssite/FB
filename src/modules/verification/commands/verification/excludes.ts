import {
  SlashCommandSubcommandBuilder,
  ChatInputCommandInteraction
} from 'discord.js';
import { VerificationRepository } from '../../database/VerificationRepository';
import { tenantStorage } from '../../../../utils/context';

function parseRoleIds(input?: string | null) {
  if (!input) return [];
  return input.split(/[,\s]+/)
    .map(s => {
      const m = s.match(/<@&?(\d+)>/);
      if (m) return m[1];
      if (/^\d+$/.test(s)) return s;
      return null;
    })
    .filter(Boolean) as string[];
}

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('excludes')
       .setDescription('⚙️ Configure roles to preserve during verification seizure')
       .addStringOption(opt => opt.setName('roles').setDescription('Comma or space separated role mentions/ids to preserve (e.g., boosters)'))
       .addStringOption(opt => opt.setName('header_roles').setDescription('Comma or space separated header role mentions/ids to preserve')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const rolesStr = interaction.options.getString('roles');
    const headerRolesStr = interaction.options.getString('header_roles');

    const excludeRoleIds = parseRoleIds(rolesStr);
    const excludeHeaderRoleIds = parseRoleIds(headerRolesStr);

    const settings = await VerificationRepository.getSettings(context.tenantId, context.guildId);
    let cfg = {} as any;
    try {
      cfg = settings.panelConfig ? JSON.parse(settings.panelConfig) : {};
    } catch (err) {
      cfg = {};
    }

    cfg.excludeRoleIds = excludeRoleIds;
    cfg.excludeHeaderRoleIds = excludeHeaderRoleIds;

    await VerificationRepository.updateSettings(context.tenantId, context.guildId, { panelConfig: JSON.stringify(cfg) });
    await interaction.editReply({ content: '✅ Exclude lists updated.' });
  }
};
