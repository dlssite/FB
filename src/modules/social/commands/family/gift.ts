import { SlashCommandSubcommandBuilder } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { InventoryService } from '../../../shop/services/InventoryService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('gift')
       .setDescription('🎁 Send a family heirloom to another member to boost dynasty reputation.')
       .addUserOption(opt => opt.setName('user').setDescription('The family member to gift').setRequired(true))
       .addStringOption(opt => opt.setName('item').setDescription('Select a gift from your inventory').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction: any) {
    const { guildId, user } = interaction;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');
    const items = await InventoryService.getHydratedCategoryItems(tenantId, guildId, user.id, 'social');
    
    const focused = interaction.options.getFocused();
    const filtered = items.filter(i => i.name.toLowerCase().includes(focused.toLowerCase())).slice(0, 25);

    await interaction.respond(
      filtered.map(i => ({ name: `${i.name} (ID: ${i.instanceId.split('-')[0]})`, value: i.instanceId }))
    );
  },

  async execute(interaction: any) {
    const { guildId, user, options } = interaction;
    const targetUser = options.getUser('user', true);
    const instanceId = options.getString('item', true);
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    // 1. Verify same family
    const [senderMembership, targetMembership] = await Promise.all([
      prisma.social_family_members.findFirst({ where: { userId: user.id, status: 'accepted' } }),
      prisma.social_family_members.findFirst({ where: { userId: targetUser.id, status: 'accepted' } })
    ]);

    if (!senderMembership || !targetMembership || senderMembership.familyId !== targetMembership.familyId) {
      return await replyV2(interaction, ContainerService.simple('❌ You can only send family gifts to members of your own dynasty.'));
    }

    // 2. Verify item ownership
    const instance = await InventoryService.getHydratedInstance(instanceId);
    if (!instance || instance.instanceId !== instanceId) {
      return await replyV2(interaction, ContainerService.simple('❌ Item not found in your inventory.'));
    }

    // 3. Consume item and boost reputation
    await prisma.shop_inventory.delete({ where: { id: instanceId } });
    
    const boost = instance.metadata.reputationBonus || 50; 
    // In this system, reputation is stored in family metadata or a separate field if we add it.
    // For now, let's assume it's a global family stat in metadata.
    const family = await prisma.social_families.findUnique({ where: { id: senderMembership.familyId } });
    const currentRep = (family?.metadata as any)?.reputation || 0;
    
    await prisma.social_families.update({
      where: { id: senderMembership.familyId },
      data: { metadata: { ...((family?.metadata as any) || {}), reputation: currentRep + boost } }
    });

    return await replyV2(interaction, ContainerService.create({
      title: '⚜️ Heirloom Gifted',
      description: `You gifted **${instance.name}** to ${targetUser}!\n\nYour dynasty's reputation has grown by **${boost}** points.`,
      color: '#F1C40F',
      interaction,
      footer: true
    }));
  }
};
