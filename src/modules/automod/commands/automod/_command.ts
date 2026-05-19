import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { AutomodRepository } from '../../database/AutomodRepository';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService } from '../../../../utils/container';

export default {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Server Defense & Automod Control Panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    const settings = await AutomodRepository.getSettings(tenantId, guildId);

    const automodContainer = ContainerService.create({
      title: '🛡️ Automod Control Panel',
      description: 'Configure your server\'s automatic defense systems. Select a category below to get started.',
      fields: [
        { name: 'Anti-Invite', value: settings?.antiInvite ? '✅ Enabled' : '❌ Disabled' },
        { name: 'Anti-Link', value: settings?.antiLink ? '✅ Enabled' : '❌ Disabled' },
        { name: 'Anti-Spam', value: settings?.antiSpam ? '✅ Enabled' : '❌ Disabled' }
      ],
      color: '#7367F0',
      footer: 'Flameborn Security • Discord V2 Interface',
      interaction,
      components: [menu, buttons]
    });

    await interaction.editReply(automodContainer);
  },
};
