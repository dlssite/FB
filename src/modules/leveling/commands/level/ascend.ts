import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { LevelingRepository } from '../../database/LevelingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('ascend')
       .setDescription('✨ Prestige: Reset level for permanent perks (Requires Level 100)'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const userRecord = await LevelingRepository.getUser(context.tenantId, context.guildId, interaction.user.id);
    const level = userRecord?.level || 1;

    if (level < 100) {
      return await replyV2(interaction,
        ContainerService.simple(Translator.t('leveling', 'prestige.not_ready', lang, { level }))
      );
    }

    // Perform Ascension
    const newPrestige = (userRecord?.prestige || 0) + 1;
    
    await prisma.users.update({
      where: { id: userRecord!.id },
      data: {
        level: 1,
        xp: 0,
        prestige: newPrestige
      }
    });

    const response = ContainerService.create({
      title: Translator.t('leveling', 'prestige.title', lang),
      description: Translator.t('leveling', 'prestige.desc', lang, { user: `<@${interaction.user.id}>`, prestige: newPrestige }),
      color: '#FFD700',
      interaction,
      footer: true
    });

    await replyV2(interaction, response);
  }
};
