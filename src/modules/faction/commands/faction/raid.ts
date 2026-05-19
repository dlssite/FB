import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { WarBoardService } from '../../services/WarBoardService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('raid')
       .setDescription('Launch a raid against a Rival Faction\'s Headquarters to steal Embers.')
       .addStringOption(option => 
            option.setName('target_faction')
                  .setDescription('The exact name of the Rival Faction to raid.')
                  .setRequired(true)
        ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const targetName = interaction.options.getString('target_faction');

    // Fetch Attacker Faction
    const myFaction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);

    if (!myFaction) {
        return await interaction.editReply({ content: '❌ You must be in a Faction to initiate a Raid.' });
    }

    const memberRecord = await prisma.faction_members.findUnique({
        where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: interaction.user.id, tenantId } }
    });

    const customRanks = (myFaction.ranks as Record<string, string[]>) || {};
    const userRankPerms = memberRecord ? customRanks[memberRecord.rank] || [] : [];

    if (myFaction.masterId !== interaction.user.id && !userRankPerms.includes('raid')) {
        return await interaction.editReply({ content: '❌ You do not have permission to authorize a Raid.' });
    }

    // Fetch Defender Faction
    const targetFaction = await FactionRepository.getFactionByName(tenantId, guildId, targetName as string);

    if (!targetFaction) {
        return await interaction.editReply({ content: '❌ Could not find a Faction with that exact name.' });
    }



    try {
        // Verify Rivalry
        const activeWar = await prisma.guild_battles.findFirst({
            where: {
                tenantId, guildId, status: 'pending',
                OR: [
                    { challengerId: myFaction.id, defenderId: targetFaction.id },
                    { challengerId: targetFaction.id, defenderId: myFaction.id }
                ]
            }
        });

        if (!activeWar) {
            return await interaction.editReply({ content: `❌ You can only raid Factions that you are in an active Rivalry with. Use \`/faction diplomacy\` to declare war first.` });
        }

        // Check Cooldown (2 hours)
        const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
        if (activeWar.updatedAt > twoHoursAgo) {
            const nextAvailable = new Date(activeWar.updatedAt.getTime() + (2 * 60 * 60 * 1000));
            return await interaction.editReply({ content: `⏱️ Your forces are regrouping. You can launch another raid at <t:${Math.floor(nextAvailable.getTime() / 1000)}:t>.` });
        }

        if (targetFaction.bankBalance <= 0) {
            return await interaction.editReply({ content: `❌ The enemy bank is empty. There is nothing to steal.` });
        }

        // RNG Roll (1-100)
        const roll = Math.floor(Math.random() * 100) + 1;
        const isSuccess = roll > 45; // 55% win rate baseline

        // Update war cooldown
        await prisma.guild_battles.update({
            where: { id: activeWar.id },
            data: { updatedAt: new Date() }
        });

        if (!isSuccess) {
            const failResponse = ContainerService.create({
                title: '💥 Raid Repelled',
                description: `Your forces launched an assault on **${targetFaction.name}**, but their defenses held strong. Your syndicate was forced to retreat empty-handed.`,
                color: '#FF0000',
                interaction,
                footer: true
            });
            return await replyV2(interaction, failResponse, true);
        }

        // --- SUCCESS LOGIC ---
        
        let stealPercentage = 0.10; // Default steal 10%

        // 1. Check Attacker Perks (War Chest)
        const attackerPerks = myFaction.perks as string[] || [];
        if (attackerPerks.includes('mil_war_chest_1')) {
            stealPercentage += 0.05; // +5%
        }

        // 2. Check Defender Buildings (Orbital Shield)
        let hasShield = false;
        if (targetFaction.hqTerritoryId) {
            const hqBuildings = await prisma.territory_buildings.findMany({
                where: { tenantId, guildId, nationId: targetFaction.hqTerritoryId, buildingId: 'faction_bld_shield' }
            });
            const shields = hqBuildings.filter(b => {
                const meta = b.metadata as any;
                return meta && meta.factionId === targetFaction.id;
            });
            hasShield = shields.length > 0;
        }

        if (hasShield) {
            stealPercentage *= 0.5; // Halve the stolen amount
        }

        const stolenAmount = Math.floor(targetFaction.bankBalance * stealPercentage);

        if (stolenAmount <= 0) {
            return await interaction.editReply({ content: `✅ The raid was successful, but the enemy bank was too low to yield any meaningful Embers.` });
        }

        // Execute Bank Transfer
        await prisma.$transaction(async (tx) => {
            await tx.factions.update({
                where: { id: myFaction.id },
                data: { bankBalance: { increment: stolenAmount } }
            });
            await tx.factions.update({
                where: { id: targetFaction.id },
                data: { bankBalance: { decrement: stolenAmount } }
            });

            // Log it
            await tx.economy_transactions.create({
                data: {
                    tenantId, userId: interaction.user.id, type: 'INCOME', category: 'FACTION_RAID',
                    amount: BigInt(stolenAmount), balance: BigInt(myFaction.bankBalance + stolenAmount),
                    reason: `Raid on ${targetFaction.name}`, metadata: { factionId: myFaction.id }
                }
            });
        });

        let description = `Your forces successfully breached the defenses of **${targetFaction.name}** and looted **💎 ${stolenAmount.toLocaleString()} Embers** for the Syndicate!`;
        if (hasShield) {
            description += `\n\n🛡️ *The enemy's Orbital Shield Generator absorbed the brunt of the attack, protecting half of their vulnerable assets.*`;
        }
        if (attackerPerks.includes('mil_war_chest_1')) {
            description += `\n\n⚔️ *Your War Chest perk maximized your loot haul.*`;
        }

        // Progress active Bounty Board Quest
        let bountyDesc = '';
        try {
            const bountyUpdate = await WarBoardService.progressBounty(tenantId, guildId, myFaction.id, 1);
            if (bountyUpdate) {
                bountyDesc = `\n\n📋 **War Board Directive Progressed:** \`${bountyUpdate.bounty.currentAmount} / ${bountyUpdate.bounty.targetAmount}\``;
                if (bountyUpdate.completed) {
                    bountyDesc += `\n🎉 **Bounty Completed!** **💎 ${bountyUpdate.reward.toLocaleString()} Embers** have been deposited into the Faction Bank!`;
                }
            }
        } catch (e) {
            // Ignore gracefully
        }
        description += bountyDesc;

        const successResponse = ContainerService.create({
            title: '🔥 Raid Successful',
            description,
            color: '#00FF00',
            interaction,
            footer: true
        });

        await replyV2(interaction, successResponse, true);

    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Raid Failed to Execute:** ${err.message}` });
    }
  }
};
