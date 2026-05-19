import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('toggle')
       .setDescription('💡 Admin: Enable or disable the leveling module'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply(ContainerService.simple(Translator.t('leveling', 'admin.no_permission', lang)) as any);
    }

    const settings = await prisma.server_settings.findUnique({
      where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } }
    });

    const newState = !(settings?.levelingOn ?? false);

    await prisma.server_settings.upsert({
      where: { guildId_tenantId: { guildId: context.guildId, tenantId: context.tenantId } },
      update: { levelingOn: newState },
      create: {
        guildId: context.guildId,
        tenantId: context.tenantId,
        levelingOn: newState
      }
    });

    const stateStr = newState ? (lang === 'fr' ? 'activé' : 'enabled') : (lang === 'fr' ? 'désactivé' : 'disabled');

    const response = ContainerService.create({
      title: Translator.t('leveling', newState ? 'admin.toggle_on' : 'admin.toggle_off', lang),
      description: Translator.t('leveling', 'admin.toggle_desc', lang, { state: stateStr }),
      color: newState ? '#28C76F' : '#EA5455',
      interaction,
      footer: true
    });

    await interaction.editReply(response as any);
  }
};
