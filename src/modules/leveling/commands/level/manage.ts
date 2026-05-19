import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('manage')
       .setDescription('🛠️ Admin: Manually set a citizen\'s neural level/XP')
       .addUserOption(opt => opt.setName('user').setDescription('Target citizen').setRequired(true))
       .addIntegerOption(opt => opt.setName('level').setDescription('Set Level'))
       .addIntegerOption(opt => opt.setName('xp').setDescription('Set XP')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await interaction.editReply(ContainerService.simple(Translator.t('leveling', 'admin.no_permission', lang)) as any);
    }

    const targetUser = interaction.options.getUser('user', true);
    const newLevel = interaction.options.getInteger('level');
    const newXp = interaction.options.getInteger('xp');

    if (newLevel === null && newXp === null) {
      return await interaction.editReply(ContainerService.simple('❌ Please specify at least one value to update (Level or XP).') as any);
    }

    const userRecord = await LevelingRepository.getUser(context.tenantId, context.guildId, targetUser.id);
    
    const finalLevel = newLevel !== null ? newLevel : (userRecord?.level || 1);
    const finalXp = newXp !== null ? newXp : (userRecord?.xp || 0);

    await LevelingRepository.updateXp(context.tenantId, context.guildId, targetUser.id, finalXp, finalLevel);

    const description = [
      `✅ Neural profile updated for <@${targetUser.id}>.`,
      newLevel !== null ? `• Level: **${finalLevel}**` : null,
      newXp !== null ? `• Experience: **${finalXp.toLocaleString()}**` : null,
    ].filter(Boolean).join('\n');

    const response = ContainerService.create({
      title: Translator.t('leveling', 'admin.override_success', lang),
      description,
      color: '#28C76F',
      interaction,
      footer: true
    });

    await interaction.editReply(response as any);
  }
};
