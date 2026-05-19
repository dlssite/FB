import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('inventory')
       .setDescription('🎒 View collected resources and items.')
       .addUserOption(opt => opt.setName('target').setDescription('The user whose inventory you want to check').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const targetUser = interaction.options.getUser('target') || interaction.user;
    const inventory = await EconomyRepository.getInventory(context.tenantId, targetUser.id);

    if (inventory.length === 0) {
      return await replyV2(
        interaction,
        ContainerService.simple(Translator.t('economy', 'inventory.empty', lang, { user: targetUser.username }))
      );
    }
    const resources = inventory.map(item => 
      `• **${item.itemName.toUpperCase()}**: \`${item.quantity}\` ${Translator.t('economy', 'inventory.units', lang)}`
    ).join('\n');

    const response = ContainerService.create({
      title: Translator.t('economy', 'inventory.title', lang, { user: targetUser.username }),
      description: resources,
      image: flamebornConfig.economy.assets.profileBanner,
      color: '#7367F0',
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
