import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { SymphonyEffectsService } from '../../services/SymphonyEffectsService';
import { EconomyRepository } from '../../../economy/database/EconomyRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('use')
       .setDescription('⚡ Consume a music item from your inventory.')
       .addStringOption(opt => 
         opt.setName('item')
            .setDescription('The item to use')
            .setRequired(true)
            .addChoices(
              { name: 'Golden Record', value: 'golden_record' }
            )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const itemValue = interaction.options.getString('item', true);
    const userId = interaction.user.id;

    const inventory = await EconomyRepository.getInventory(tenantId, userId);
    const item = inventory.find(i => i.itemName === itemValue && i.quantity > 0);

    if (!item) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Item Not Found',
        description: `You do not have any **${itemValue.replace('_', ' ')}** in your inventory.`,
        color: '#E74C3C',
        interaction
      }));
    }

    if (itemValue === 'golden_record') {
      await EconomyRepository.updateItemQuantity(tenantId, userId, 'golden_record', -1);
      await SymphonyEffectsService.activateGoldenHour(guildId);

      const container = ContainerService.create({
        title: '✨ Symphony | GOLDEN HOUR ACTIVATED!',
        description: `<@${userId}> has played a **Golden Record**! \n\n🚀 **Perks for the next 60 minutes:**\n- **3x XP** for all listeners\n- **Free Jukebox** (No token/Ember cost)`,
        color: '#F1C40F',
        footer: true,
        interaction
      });

      return await replyV2(interaction, container);
    }
  }
};
