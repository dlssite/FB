import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { ProfileService } from '../../services/ProfileService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('admintitle')
       .setDescription('🏷️ Admin command to assign lore or VIP titles to citizens.')
       .addUserOption(opt => opt.setName('target').setDescription('The citizen to assign a title to').setRequired(true))
       .addStringOption(opt => opt.setName('title').setDescription('The custom title (leave blank to remove)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';
    const tenantId = context.tenantId;

    const isAdmin = (interaction.member?.permissions as PermissionsBitField)?.has(PermissionsBitField.Flags.Administrator) || false;
    if (!isAdmin) {
      const errResponse = ContainerService.create({
        title: '❌ Access Denied',
        description: Translator.t('profile', 'admintitle.no_permission', lang),
        color: '#D32F2F',
        interaction
      });
      return await replyV2(interaction, errResponse);
    }

    const targetUser = interaction.options.getUser('target', true);
    const title = interaction.options.getString('title');

    await ProfileService.updateAdminTitle(tenantId, targetUser.id, title);

    const desc = title 
      ? Translator.t('profile', 'admintitle.set_success', lang, { title, user: targetUser.id })
      : Translator.t('profile', 'admintitle.remove_success', lang, { user: targetUser.id });

    const response = ContainerService.create({
      title: Translator.t('profile', 'admintitle.title', lang),
      description: desc,
      color: '#E91E63',
      interaction
    });

    await replyV2(interaction, response);
  }
};
