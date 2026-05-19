import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FunService } from '../../services/FunService';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('roast')
       .setDescription('🔥 Deliver a lighthearted roast to someone!')
       .addUserOption(opt => 
         opt.setName('target')
            .setDescription('The user you want to roast')
            .setRequired(true)
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    const lang = shim.lang || 'en';
    const target = interaction.options.getUser('target', true);

    const roastText = await FunService.getRoast(target.id);

    const embed = ContainerService.create({
      title: Translator.t('fun', 'roast.title', lang) || '🔥 ROASTED!',
      description: roastText,
      color: '#ff3300', // Fire Red
      footer: Translator.t('fun', 'roast.footer', lang) || "Don't take it personally... or do.",
      thumbnail: target.displayAvatarURL()
    });

    await replyV2(interaction, embed);
  }
};
