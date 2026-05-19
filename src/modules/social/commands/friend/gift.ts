import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { InventoryService } from '../../../shop/services/InventoryService';
import { SocialService } from '../../services/SocialService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('gift')
       .setDescription('🎁 Send a gift to a friend to boost your bond score.')
       .addUserOption(opt => opt.setName('user').setDescription('The friend to gift').setRequired(true))
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
    const targetUser = options.getUser('user', true);
    const instanceId = options.getString('item', true);
    const { tenantStorage } = await import('../../../../utils/context');
    const tenantId = tenantStorage.getStore()?.tenantId || await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Verify friendship
    const friendship = await SocialService.getFriendship(tenantId, guildId, user.id, targetUser.id);
    if (!friendship || friendship.status !== 'accepted') {
      return await replyV2(interaction, ContainerService.simple('❌ You can only gift items to accepted friends.'));
    }

    // 2. Verify item ownership
    const instance = await InventoryService.getHydratedInstance(instanceId);
    if (!instance || instance.instanceId !== instanceId) {
      return await replyV2(interaction, ContainerService.simple('❌ Item not found in your inventory.'));
    }

    // 3. Consume item and boost bond
    await prisma.shop_inventory.delete({ where: { id: instanceId } });
    
    const boost = instance.metadata.bondBonus || 20; 
    await prisma.social_friends.update({
      where: { id: friendship.id },
      data: { bondScore: { increment: boost } }
    });

    return await replyV2(interaction, ContainerService.create({
      title: '🎁 Gift Delivered',
      description: `You gifted **${instance.name}** to ${targetUser}!\n\nYour bond has strengthened by **${boost}** points.`,
      color: '#2ECC71',
      interaction,
      footer: true
    }));
  }
};
