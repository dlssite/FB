import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { WarBoardService } from '../../services/WarBoardService';
import { prisma } from '../../../../database/client';

const EXPEDITION_COST = 25000;
const EXPEDITION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const POTENTIAL_LOOT = [
    { itemName: 'Eternal Rose', weight: 30 },
    { itemName: 'Bio-Organic Chocolates', weight: 25 },
    { itemName: 'Scrap Metal', weight: 40 },
    { itemName: 'Energy Cell', weight: 15 },
    { itemName: 'Prismite Shard', weight: 5 }
];

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('expedition')
       .setDescription('Manage Faction PvE Expeditions.')
       .addStringOption(opt => 
            opt.setName('action')
               .setDescription('Action to perform')
               .setRequired(true)
               .addChoices(
                   { name: 'Launch', value: 'launch' },
                   { name: 'Status/Claim', value: 'claim' }
               )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const action = interaction.options.getString('action');

    const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);
    if (!faction) {
        return await interaction.editReply({ content: '❌ You must be in a Faction to launch an expedition.' });
    }



    try {
        const expedition = (faction.expedition as any) || null;

        if (action === 'launch') {
            if (expedition) {
                const timeLeft = new Date(expedition.endTime).getTime() - Date.now();
                if (timeLeft > 0) {
                    return await interaction.editReply({ content: `❌ Your Faction already has an active expedition. It returns in **${Math.ceil(timeLeft / (60 * 60 * 1000))} hours**.` });
                }
            }

            if (faction.bankBalance < EXPEDITION_COST) {
                return await interaction.editReply({ content: `❌ Your Faction Bank does not have enough Embers (Cost: ${EXPEDITION_COST.toLocaleString()}).` });
            }

            const endTime = new Date(Date.now() + EXPEDITION_DURATION);

            await prisma.factions.update({
                where: { id: faction.id },
                data: {
                    bankBalance: { decrement: EXPEDITION_COST },
                    expedition: { endTime: endTime.toISOString(), cost: EXPEDITION_COST }
                }
            });

            const response = ContainerService.create({
                title: '🚀 Expedition Launched',
                description: `Your Syndicate has funded a deep-space expedition for **💎 ${EXPEDITION_COST.toLocaleString()} Embers**.\n\nThe crew will return in **24 hours** with whatever loot they can find.`,
                color: '#9932CC',
                interaction,
                footer: true
            });
            return await replyV2(interaction, response, true);
        }

        if (action === 'claim') {
            if (!expedition) {
                return await interaction.editReply({ content: '❌ Your Faction does not have an active or completed expedition. Launch one first!' });
            }

            const timeLeft = new Date(expedition.endTime).getTime() - Date.now();
            if (timeLeft > 0) {
                return await interaction.editReply({ content: `⏱️ The expedition is still in progress. It returns in **${Math.ceil(timeLeft / (60 * 60 * 1000))} hours**.` });
            }

            // Generate Loot
            const lootReceived: { itemName: string, quantity: number }[] = [];
            const emberReward = Math.floor(EXPEDITION_COST * (0.8 + Math.random() * 1.5)); // 80% to 230% ROI

            // Pick 2-4 random items
            const itemCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < itemCount; i++) {
                const random = Math.random() * 100;
                let cumulativeWeight = 0;
                for (const item of POTENTIAL_LOOT) {
                    cumulativeWeight += item.weight;
                    if (random <= cumulativeWeight) {
                        const existing = lootReceived.find(l => l.itemName === item.itemName);
                        if (existing) existing.quantity += 1;
                        else lootReceived.push({ itemName: item.itemName, quantity: 1 });
                        break;
                    }
                }
            }

            // Update Vault and Bank
            await prisma.$transaction(async (tx) => {
                const currentFaction = await tx.factions.findUnique({ where: { id: faction.id } });
                if (!currentFaction) throw new Error('Faction not found.');

                const vault = (currentFaction.vault as any[]) || [];
                for (const item of lootReceived) {
                    const existingInVault = vault.find(v => v.itemName === item.itemName);
                    if (existingInVault) existingInVault.quantity += item.quantity;
                    else vault.push(item);
                }

                await tx.factions.update({
                    where: { id: faction.id },
                    data: {
                        bankBalance: { increment: emberReward },
                        vault,
                        expedition: null as any // Reset expedition
                    }
                });
            });

            const lootDesc = lootReceived.map(l => `- **${l.itemName}**: x${l.quantity}`).join('\n');
            
            // Progress active Bounty Board Quest
            let bountyDesc = '';
            try {
                const bountyUpdate = await WarBoardService.progressBounty(tenantId, guildId, faction.id, 1);
                if (bountyUpdate) {
                    bountyDesc = `\n\n📋 **War Board Directive Progressed:** \`${bountyUpdate.bounty.currentAmount} / ${bountyUpdate.bounty.targetAmount}\``;
                    if (bountyUpdate.completed) {
                        bountyDesc += `\n🎉 **Bounty Completed!** **💎 ${bountyUpdate.reward.toLocaleString()} Embers** have been deposited into the Faction Bank!`;
                    }
                }
            } catch (e) {
                // Ignore gracefully
            }

            const response = ContainerService.create({
                title: '📦 Expedition Return',
                description: `The expedition crew has returned safely!\n\n**Ember Payout:** 💎 ${emberReward.toLocaleString()}\n\n**Vault Assets Looted:**\n${lootDesc}${bountyDesc}`,
                color: '#32CD32',
                interaction,
                footer: true
            });
            return await replyV2(interaction, response, true);
        }

    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Expedition Action Failed:** ${err.message}` });
    }
  }
};
