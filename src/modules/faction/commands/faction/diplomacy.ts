import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('diplomacy')
       .setDescription('Manage Faction relations (Rivalries and Alliances).')
       .addStringOption(option => 
            option.setName('action')
                  .setDescription('The diplomatic action to take.')
                  .setRequired(true)
                  .addChoices(
                      { name: 'Declare Rivalry (War)', value: 'war' },
                      { name: 'Propose Alliance', value: 'ally' }
                  )
        )
       .addStringOption(option => 
            option.setName('target_faction')
                  .setDescription('The exact name of the target Faction.')
                  .setRequired(true)
        ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const action = interaction.options.getString('action');
    const targetName = interaction.options.getString('target_faction');

    // Fetch User's Faction
    const myFaction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);

    if (!myFaction) {
        return await interaction.editReply({ content: '❌ You must be in a Faction to engage in diplomacy.' });
    }

    const memberRecord = await prisma.faction_members.findUnique({
        where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: interaction.user.id, tenantId } }
    });

    const customRanks = (myFaction.ranks as Record<string, string[]>) || {};
    const userRankPerms = memberRecord ? customRanks[memberRecord.rank] || [] : [];

    if (myFaction.masterId !== interaction.user.id && !userRankPerms.includes('war')) {
        return await interaction.editReply({ content: '❌ You do not have permission to make diplomatic decisions.' });
    }

    // Fetch Target Faction
    const targetFaction = await FactionRepository.getFactionByName(tenantId, guildId, targetName as string);

    if (!targetFaction) {
        return await interaction.editReply({ content: '❌ Could not find a Faction with that exact name.' });
    }

    if (targetFaction.id === myFaction.id) {
        return await interaction.editReply({ content: '❌ You cannot perform diplomacy with your own Faction.' });
    }



    try {
        if (action === 'war') {
            // Check if already at war
            const existingWar = await prisma.guild_battles.findFirst({
                where: {
                    tenantId, guildId, status: 'pending',
                    OR: [
                        { challengerId: myFaction.id, defenderId: targetFaction.id },
                        { challengerId: targetFaction.id, defenderId: myFaction.id }
                    ]
                }
            });

            if (existingWar) {
                return await interaction.editReply({ content: `❌ You are already engaged in a Rivalry Skirmish with **${targetFaction.name}**.` });
            }

            await prisma.guild_battles.create({
                data: {
                    tenantId,
                    guildId,
                    challengerId: myFaction.id,
                    defenderId: targetFaction.id,
                    objective: 'Supremacy',
                    status: 'pending',
                    wager: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            const warResponse = ContainerService.create({
                title: '⚔️ RIVALRY DECLARED',
                description: `**${myFaction.name}** has officially declared a Rivalry against **${targetFaction.name}**!\n\nThe Skirmish will be tracked on the War Board.`,
                color: '#FF0000',
                interaction,
                footer: true
            });
            await replyV2(interaction, warResponse, true);

        } else if (action === 'ally') {
            // Check if they have the Diplomatic Envoys Tech unlocked
            const perks = myFaction.perks as string[] || [];
            if (!perks.includes('soc_alliance_cap')) {
                return await interaction.editReply({ content: '❌ Your Faction has not researched **Diplomatic Envoys** in the Tech Tree. You cannot form Alliances yet.' });
            }

            const existingAlliance = await prisma.guild_battles.findFirst({
                where: {
                    tenantId, guildId, status: 'alliance',
                    OR: [
                        { challengerId: myFaction.id, defenderId: targetFaction.id },
                        { challengerId: targetFaction.id, defenderId: myFaction.id }
                    ]
                }
            });

            if (existingAlliance) {
                return await interaction.editReply({ content: `❌ You are already allied with **${targetFaction.name}**.` });
            }

            // Create Alliance (Using guild_battles table as a generic relations table with status='alliance')
            await prisma.guild_battles.create({
                data: {
                    tenantId,
                    guildId,
                    challengerId: myFaction.id,
                    defenderId: targetFaction.id,
                    objective: 'Mutual Defense',
                    status: 'alliance',
                    wager: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            const allyResponse = ContainerService.create({
                title: '🤝 ALLIANCE FORMED',
                description: `**${myFaction.name}** has formally allied with **${targetFaction.name}**.\n\nYour members will now receive mutual support bonuses.`,
                color: '#00FF00',
                interaction,
                footer: true
            });
            await replyV2(interaction, allyResponse, true);
        }

    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Diplomacy Failed:** ${err.message}` });
    }
  }
};
