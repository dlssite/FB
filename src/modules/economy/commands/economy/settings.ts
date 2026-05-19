import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { GuildService } from '../../../../services/GuildService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('⚙️ Configure economy settings for this server.')
       .addRoleOption(opt => opt.setName('mining_role').setDescription('The role given to active miners'))
       .addRoleOption(opt => opt.setName('richest_role').setDescription('The role given to the richest citizen (#1 on leaderboard)')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(
        interaction,
        ContainerService.simple(Translator.t('economy', 'admin.no_permission', lang))
      );
    }

    const miningRole = interaction.options.getRole('mining_role');
    const richestRole = interaction.options.getRole('richest_role');

    if (!miningRole && !richestRole) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'admin.settings_empty', lang)));
    }

    let description = '';
    if (miningRole) {
      await GuildService.updateMiningRole(context.tenantId, context.guildId, miningRole.id);
      description += `${Translator.t('economy', 'admin.settings_mining', lang, { role: miningRole.id })}\n`;
    }
    if (richestRole) {
      await GuildService.updateRichestRole(context.tenantId, context.guildId, richestRole.id);
      description += `${Translator.t('economy', 'admin.settings_richest', lang, { role: richestRole.id })}\n`;
    }

    const response = ContainerService.create({
      title: Translator.t('economy', 'admin.settings_title', lang),
      description: Translator.t('economy', 'admin.settings_desc', lang, { desc: description }),
      color: '#28C76F',
      interaction,
      footer: true
    });

    await replyV2(interaction, response);
  }
};
