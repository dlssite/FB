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

      const embed = new EmbedBuilder()
        .setTitle('⚙️ Server Configuration')
        .setColor('#7367F0')
        .addFields(
          { name: '🔤 Prefix', value: `\`${prefix}\``, inline: true },
          { name: '🌐 Language', value: lang === 'en' ? '🇺🇸 English' : lang === 'fr' ? '🇫🇷 Français' : lang, inline: true },
          { name: '\u200B', value: '\u200B', inline: false },
          { name: '💡 Tip', value: `Use \`${prefix}prefix <new>\` to change prefix or \`/lang\` to change language`, inline: false }
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
