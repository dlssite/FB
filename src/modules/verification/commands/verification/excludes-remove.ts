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
    sub.setName('excludes-remove')
       .setDescription('➖ Remove roles from the verification preserve lists')
       .addStringOption(opt => opt.setName('roles').setDescription('Role mentions or ids to remove (comma/space separated)'))
       .addStringOption(opt => opt.setName('header_roles').setDescription('Header role mentions or ids to remove (comma/space separated)')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const rolesStr = interaction.options.getString('roles');
    const headerRolesStr = interaction.options.getString('header_roles');

    const remRoleIds = parseRoleIds(rolesStr);
    const remHeaderRoleIds = parseRoleIds(headerRolesStr);

    const settings = await VerificationRepository.getSettings(context.tenantId, context.guildId);
    let cfg: any = {};
    try {
      cfg = settings.panelConfig ? JSON.parse(settings.panelConfig) : {};
    } catch (err) {
      cfg = {};
    }

    cfg.excludeRoleIds = Array.isArray(cfg.excludeRoleIds) ? cfg.excludeRoleIds : [];
    cfg.excludeHeaderRoleIds = Array.isArray(cfg.excludeHeaderRoleIds) ? cfg.excludeHeaderRoleIds : [];

    cfg.excludeRoleIds = cfg.excludeRoleIds.filter((id: string) => !remRoleIds.includes(id));
    cfg.excludeHeaderRoleIds = cfg.excludeHeaderRoleIds.filter((id: string) => !remHeaderRoleIds.includes(id));

    await VerificationRepository.updateSettings(context.tenantId, context.guildId, { panelConfig: JSON.stringify(cfg) });
    await interaction.editReply({ content: `✅ Removed ${remRoleIds.length} roles and ${remHeaderRoleIds.length} header roles.` });
  }
};
