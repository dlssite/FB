import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('vault')
       .setDescription('Manage the Faction Vault items.')
       .addStringOption(opt => 
            opt.setName('action')
               .setDescription('Action to perform')
               .setRequired(true)
               .addChoices(
                   { name: 'View', value: 'view' },
                   { name: 'Deposit', value: 'deposit' },
                   { name: 'Withdraw', value: 'withdraw' }
               )
       )
       .addStringOption(opt => opt.setName('item').setDescription('Item name to deposit or withdraw').setRequired(false))
       .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const action = interaction.options.getString('action');
    const itemName = interaction.options.getString('item');
    const amount = interaction.options.getInteger('amount') || 1;

    const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);
    if (!faction) {
        return await interaction.editReply({ content: '❌ You must be in a Faction to access the Vault.' });
    }



    try {
        let vault = (faction.vault as any[]) || [];

        if (action === 'view') {
            if (vault.length === 0) {
                return await interaction.editReply({ content: '📦 The Faction Vault is currently empty.' });
            }

            const description = vault.map(i => `- **${i.itemName}**: x${i.quantity}`).join('\n');
            const response = ContainerService.create({
                title: `📦 ${faction.name} Vault`,
                description: `**Inventory Assets:**\n${description}`,
                color: '#8B4513',
                interaction,
                footer: true
            });
            return await replyV2(interaction, response, true);
        }

        if (!itemName) {
            return await interaction.editReply({ content: '❌ You must specify an item name for this action.' });
        }

        if (action === 'deposit') {
            // Check user inventory
            const inventoryItem = await prisma.inventory_adventures.findUnique({
                where: { userId_itemName_tenantId: { userId: interaction.user.id, itemName, tenantId } }
            });

            if (!inventoryItem || inventoryItem.quantity < amount) {
                return await interaction.editReply({ content: `❌ You do not have x${amount} **${itemName}** in your inventory.` });
            }

            // Update user inventory and faction vault
            await prisma.$transaction(async (tx) => {
                // Deduct from user
                if (inventoryItem.quantity === amount) {
                    await tx.inventory_adventures.delete({ where: { id: inventoryItem.id } });
                } else {
                    await tx.inventory_adventures.update({
                        where: { id: inventoryItem.id },
                        data: { quantity: { decrement: amount } }
                    });
                }

                // Add to vault
                const existingInVault = vault.find(i => i.itemName === itemName);
                if (existingInVault) {
                    existingInVault.quantity += amount;
                } else {
                    vault.push({ itemName, quantity: amount });
                }

                await tx.factions.update({
                    where: { id: faction.id },
                    data: { vault }
                });
            });

            return await interaction.editReply({ content: `✅ Successfully deposited x${amount} **${itemName}** into the Faction Vault.` });
        }

        if (action === 'withdraw') {
            // Check rank (Master or 'vault' permission)
            const memberRecord = await prisma.faction_members.findUnique({
                where: { factionId_userId_tenantId: { factionId: faction.id, userId: interaction.user.id, tenantId } }
            });

            const customRanks = (faction.ranks as Record<string, string[]>) || {};
            const userRankPerms = memberRecord ? customRanks[memberRecord.rank] || [] : [];

            if (faction.masterId !== interaction.user.id && !userRankPerms.includes('vault')) {
                return await interaction.editReply({ content: '❌ You do not have permission to withdraw items from the Vault.' });
            }

            const itemInVault = vault.find(i => i.itemName === itemName);
            if (!itemInVault || itemInVault.quantity < amount) {
                return await interaction.editReply({ content: `❌ The vault does not have x${amount} **${itemName}**.` });
            }

            // Update vault and user inventory
            await prisma.$transaction(async (tx) => {
                // Deduct from vault
                if (itemInVault.quantity === amount) {
                    vault = vault.filter(i => i.itemName !== itemName);
                } else {
                    itemInVault.quantity -= amount;
                }

                await tx.factions.update({
                    where: { id: faction.id },
                    data: { vault }
                });

                // Add to user inventory
                await tx.inventory_adventures.upsert({
                    where: { userId_itemName_tenantId: { userId: interaction.user.id, itemName, tenantId } },
                    update: { quantity: { increment: amount } },
                    create: { userId: interaction.user.id, itemName, tenantId, quantity: amount }
                });
            });

            return await interaction.editReply({ content: `✅ Successfully withdrew x${amount} **${itemName}** from the Faction Vault.` });
        }

    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Vault Action Failed:** ${err.message}` });
    }
  }
};
