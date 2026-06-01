import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { GuildService } from '../../../../services/GuildService';
import { getTenantContext } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('config')
      .setDescription('Check the server\'s current prefix and language settings'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, guildId } = getTenantContext();
    
    try {
      const settings = await GuildService.getSettings(tenantId, guildId);
      const prefix = settings?.prefix || '!';
      const lang = settings?.lang || 'en';

      const allowedRoleIds = settings?.botAllowedRoleIds
        ? Array.isArray(settings.botAllowedRoleIds)
          ? settings.botAllowedRoleIds
          : JSON.parse(settings.botAllowedRoleIds as any)
        : [];

      const allowedRolesText = allowedRoleIds.length > 0
        ? allowedRoleIds.map((id: string) => `<@&${id}>`).join(', ')
        : '*No restrictions configured*';

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Server Configuration')
        .setColor('#7367F0')
        .addFields(
          { name: '🔤 Prefix', value: `\`${prefix}\``, inline: true },
          { name: '🌐 Language', value: lang === 'en' ? '🇺🇸 English' : lang === 'fr' ? '🇫🇷 Français' : lang, inline: true },
          { name: '🔐 Bot Access Roles', value: allowedRolesText, inline: false },
          { name: '\u200B', value: '\u200B', inline: false },
          { name: '💡 Tip', value: `Use \`/bot restrict\` to manage access roles for bot usage.`, inline: false }
        )
        .setFooter({ text: `Guild ID: ${guildId}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Failed to load config: ${error.message}`,
      });
    }
  },
};
