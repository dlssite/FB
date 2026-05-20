import { SlashCommandSubcommandBuilder } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';
import { InventoryService } from '../../../shop/services/InventoryService';
import { RoutingService } from '../../../../services/RoutingService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('repair')
       .setDescription('🔧 Restore your vehicle to 100% condition.'),

  async execute(interaction: any) {
    const { guild, member } = interaction;
    const guildId = guild.id;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const allItems = await InventoryService.getHydratedCategoryItems(tenantId, guildId, member.id);
    const vehicles = allItems.filter(item => item.metadata?.isVehicle === true);
    if (!vehicles.length) return await replyV2(interaction, ContainerService.simple('❌ No vehicles to repair.'));

    const primary = vehicles[0];
    if (primary.condition >= 100) return await replyV2(interaction, ContainerService.simple('✅ Your primary vehicle is already at 100% condition.'));

    const repairCost = (100 - primary.condition) * 10; // 10 embers per %
    
    // Economy integration check
    const user = await prisma.flameborn_users.findUnique({ where: { userId_tenantId: { userId: member.id, tenantId } } });
    if (!user || (user.embers || 0n) < BigInt(repairCost)) {
      return await replyV2(interaction, ContainerService.simple(`❌ Insufficient Embers. You need **${repairCost}** embers for a full repair.`));
    }

    // Deduct and Repair
    await prisma.flameborn_users.update({
      where: { userId_tenantId: { userId: member.id, tenantId } },
      data: { embers: { decrement: BigInt(repairCost) } }
    });

    await InventoryService.repairItem(primary.instanceId);

    return await replyV2(interaction, ContainerService.create({
      title: '🔧 Repair Successful',
      description: `**${primary.name}** has been restored to 100% condition!\nCost: **${repairCost}** Embers.`,
      color: '#2ECC71',
      interaction,
      footer: true
    }));
  }
};
