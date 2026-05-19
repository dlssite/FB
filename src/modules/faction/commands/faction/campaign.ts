import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('campaign')
       .setDescription('Launch a political or military campaign to gain Territory Influence.')
       .addIntegerOption(opt => opt.setName('embers').setDescription('Amount of Embers to spend from Faction Bank').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const embers = interaction.options.getInteger('embers') || 0;
    if (embers < 5000) {
        return await interaction.editReply({ content: '❌ Minimum campaign cost is **5,000 Embers**.' });
    }

    const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);
    if (!faction) {
        return await interaction.editReply({ content: '❌ You must be in a Faction to launch a campaign.' });
    }

    if (!faction.hqTerritoryId) {
        return await interaction.editReply({ content: '❌ Your Faction must have a Headquarters to launch campaigns. Claim one using `/faction hq claim`.' });
    }



    try {
        if (faction.bankBalance < embers) {
            return await interaction.editReply({ content: `❌ Your Faction Bank does not have enough Embers (Current: ${faction.bankBalance.toLocaleString()}).` });
        }

        const influenceGained = Math.floor(embers / 1000); // 1 point per 1000 embers

        await prisma.$transaction(async (tx) => {
            // Deduct from Bank
            await tx.factions.update({
                where: { id: faction.id },
                data: { bankBalance: { decrement: embers } }
            });

            // Update Territory Influence
            const territory = await tx.transport_nations.findUnique({ where: { id: faction.hqTerritoryId! } });
            if (!territory) throw new Error('HQ Territory not found.');

            const influence = (territory.influence as Record<string, number>) || {};
            const currentInfluence = influence[faction.id.toString()] || 0;
            influence[faction.id.toString()] = currentInfluence + influenceGained;

            // Determine new Sovereign
            let maxInfluence = 0;
            let newSovereignId = territory.sovereignFactionId;

            for (const [fId, points] of Object.entries(influence)) {
                if (points > maxInfluence) {
                    maxInfluence = points;
                    newSovereignId = parseInt(fId);
                }
            }

            await tx.transport_nations.update({
                where: { id: territory.id },
                data: { influence, sovereignFactionId: newSovereignId }
            });
        });

        const response = ContainerService.create({
            title: '📣 Campaign Successful',
            description: `**${faction.name}** spent **💎 ${embers.toLocaleString()} Embers** to launch a widespread campaign.\n\n**Influence Gained:** +${influenceGained} points.\n\nYour Syndicate now holds the dominant presence in your Headquarters territory.`,
            color: '#1E90FF',
            interaction,
            footer: true
        });

        await replyV2(interaction, response, true);
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Campaign Failed:** ${err.message}` });
    }
  }
};
