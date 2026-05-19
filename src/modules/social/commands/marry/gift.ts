import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { InventoryService } from '../../../shop/services/InventoryService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('gift')
       .setDescription('🎁 Send a gift to your partner to boost your resonance score.')
       .addStringOption(opt => opt.setName('item').setDescription('Select a gift from your inventory').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction: any) {
    const { guildId, user } = interaction;
    const { tenantStorage } = await import('../../../../utils/context');
    const tenantId = tenantStorage.getStore()?.tenantId || await RoutingService.resolveTenantId(guildId, 'economy');
    const items = await InventoryService.getHydratedCategoryItems(tenantId, guildId, user.id, 'social');
    
    const focused = interaction.options.getFocused();
    const filtered = items.filter(i => i.name.toLowerCase().includes(focused.toLowerCase())).slice(0, 25);

    try {
      await interaction.respond(
        filtered.map(i => ({ name: `${i.name} (ID: ${i.instanceId.split('-')[0]})`, value: i.instanceId }))
      );
    } catch (e) {
      // Ignore expired interaction errors
    }
  },

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const instanceId = options.getString('item', true);
    const { tenantStorage } = await import('../../../../utils/context');
    const tenantId = tenantStorage.getStore()?.tenantId || await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Verify marriage
    const marriage = await prisma.social_marriages.findFirst({
      where: {
        guildId,
        tenantId,
        status: 'married',
        OR: [{ user1Id: user.id }, { user2Id: user.id }]
      }
    });

    if (!marriage) return await replyV2(interaction, ContainerService.simple('❌ You must be married to send a resonance gift.'));

    // 2. Verify item ownership
    const instance = await InventoryService.getHydratedInstance(instanceId);
    if (!instance || instance.instanceId !== instanceId) {
      return await replyV2(interaction, ContainerService.simple('❌ Item not found in your inventory.'));
    }

    const partnerId = marriage.user1Id === user.id ? marriage.user2Id : marriage.user1Id;
    const partner = await interaction.client.users.fetch(partnerId).catch(() => null);

    // 3. Consume item and boost resonance
    await prisma.shop_inventory.delete({ where: { id: instanceId } });
    
    const boost = instance.metadata.resonanceBonus || 50; 
    await prisma.social_marriages.update({
      where: { id: marriage.id },
      data: { resonanceScore: { increment: boost } }
    });

    return await replyV2(interaction, ContainerService.create({
      title: '💝 Resonance Gift Delivered',
      description: `You gifted **${instance.name}** to your partner ${partner}!\n\nYour resonance has grown by **${boost}** points.`,
      color: '#FF69B4',
      interaction,
      footer: true
    }));
  }
};
