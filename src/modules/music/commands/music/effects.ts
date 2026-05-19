import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { EffectManager } from '../../services/EffectManager';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('effects')
       .setDescription('🎛️ Apply audio filters to the current track.')
       .addStringOption(opt => 
         opt.setName('type')
            .setDescription('The filter to apply')
            .setRequired(true)
            .addChoices(
              { name: 'Bass Boost', value: 'bass' },
              { name: 'Nightcore', value: 'nightcore' },
              { name: 'Vaporwave', value: 'vaporwave' },
              { name: '8D Audio', value: '8d' },
              { name: 'Reset Filters', value: 'reset' }
            )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const filterType = interaction.options.getString('type', true);

    await EffectManager.applyFilter(tenantId, guildId, filterType);

    const container = ContainerService.create({
      title: '🎛️ Symphony | Effect Applied',
      description: `The **${filterType.toUpperCase()}** filter has been engaged.`,
      color: '#1ABC9C',
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
