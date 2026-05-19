import { Events, Interaction, MessageFlags } from 'discord.js';
import { AutomodRepository } from '../database/AutomodRepository';
import { TenantRepository } from '../../../repositories/TenantRepository';
import { tenantStorage } from '../../../utils/context';

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction) {
    // Only handle Automod-prefixed components
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('automod_')) return;

    const guildId = interaction.guildId;
    if (!guildId) return;

    // Resolve tenant context
    const tenantId = await TenantRepository.getTenantForGuild(guildId) || process.env.TENANT_ID || 'tenant_alpha_01';

    await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
      try {
        if (interaction.isButton()) {
          await handleButton(interaction, tenantId, guildId);
        } else if (interaction.isStringSelectMenu()) {
          await handleMenu(interaction, tenantId, guildId);
        }
      } catch (error) {
        console.error('[Automod Interaction Error]:', error);
        await interaction.reply({ content: '❌ Failed to process automod action.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
      }
    });
  },
};

async function handleButton(interaction: any, tenantId: string, guildId: string) {
  const settings = await AutomodRepository.getSettings(tenantId, guildId);
  
  if (interaction.customId === 'automod_toggle_invite') {
    const newVal = !settings?.antiInvite;
    await AutomodRepository.upsertSettings(tenantId, guildId, { antiInvite: newVal });
    await interaction.reply({ content: `✅ Anti-Invite is now **${newVal ? 'ENABLED' : 'DISABLED'}**.`, flags: [MessageFlags.Ephemeral] });
  }

  if (interaction.customId === 'automod_toggle_link') {
    const newVal = !settings?.antiLink;
    await AutomodRepository.upsertSettings(tenantId, guildId, { antiLink: newVal });
    await interaction.reply({ content: `✅ Anti-Link is now **${newVal ? 'ENABLED' : 'DISABLED'}**.`, flags: [MessageFlags.Ephemeral] });
  }
}

async function handleMenu(interaction: any, tenantId: string, guildId: string) {
  // Logic for switching categories in the embed...
  await interaction.reply({ content: `🔍 Switched to category: **${interaction.values[0]}** (Logic coming soon)`, flags: [MessageFlags.Ephemeral] });
}
