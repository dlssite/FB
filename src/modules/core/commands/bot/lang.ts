import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../../../database/client';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('lang')
      .setDescription('Changes the bot\'s language for this server')
      .addStringOption(opt => 
        opt.setName('language')
          .setDescription('The language to switch to')
          .setRequired(true)
          .addChoices(
            { name: 'English', value: 'en' },
            { name: 'Français', value: 'fr' }
          )
      ),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const newLang = interaction.options.getString('language', true);
    const ctx = tenantStorage.getStore();
    const guildId = ctx?.guildId!;
    const tenantId = ctx?.tenantId || 'tenant_alpha_01';

    // 1. Update Database
    await prisma.server_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: { lang: newLang },
      create: { 
        guildId, 
        tenantId, 
        lang: newLang, 
        prefix: '!'
      }
    });

    // 2. Confirmation in the NEW language
    const successMsg = Translator.t('core', 'lang.success', newLang, { lang: newLang.toUpperCase() });
    await interaction.editReply(successMsg);
  },
};
