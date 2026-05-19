import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { TerritoryRepository } from '../../../territory/database/TerritoryRepository';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('hq')
       .setDescription('Manage your Faction Headquarters.')
       .addStringOption(option => 
            option.setName('claim')
                  .setDescription('Type the exact Nation name to claim as your Headquarters')
                  .setRequired(false)
        ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    // 1. Fetch User's Faction
    const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);

    if (!faction) {
        return await interaction.editReply({ content: '❌ You must be in a Faction to manage a Headquarters.' });
    }

    if (faction.masterId !== interaction.user.id) {
        return await interaction.editReply({ content: '❌ Only the Faction Leader can manage the Headquarters.' });
    }

    const claimName = interaction.options.getString('claim');

    // If claimName is provided by typed name
    if (claimName) {
        const territory = await prisma.transport_nations.findFirst({
            where: { 
                tenantId, 
                guildId, 
                name: { equals: claimName.trim(), mode: 'insensitive' }
            }
        });

        if (!territory) {
            return await interaction.editReply({ content: `❌ Could not find a Nation named **${claimName}** in this server.` });
        }

        await prisma.factions.update({
            where: { id: faction.id },
            data: { hqTerritoryId: territory.id }
        });

        const successResponse = ContainerService.create({
            title: '📍 Headquarters Claimed',
            description: `The Syndicate **${faction.name}** has officially claimed **${territory.name}** as its Base of Operations.\n\nPassive buffs from this region are now active for all members.`,
            color: '#00FF00',
            interaction,
            footer: true
        });

        return await replyV2(interaction, successResponse, false);
    }

    // Otherwise, show current HQ status with select menu dropdown of all available nations
    let hqDisplay = 'Nomadic (No HQ Claimed)';
    if (faction.hqTerritoryId) {
        const territory = await prisma.transport_nations.findUnique({ where: { id: faction.hqTerritoryId } });
        if (territory) hqDisplay = `📍 Active Headquarters: **${territory.name}**\n\n*Select a new Nation from the dropdown below to relocate your HQ base.*`;
    } else {
        hqDisplay = `📍 **No Headquarters Claimed**\n\n*Select a Nation from the dropdown below to establish your Headquarters!*`;
    }

    const territories = await TerritoryRepository.listByGuild(tenantId, guildId);

    if (territories.length === 0) {
        const noNationsResponse = ContainerService.create({
            title: `🛡️ ${faction.name} Headquarters`,
            description: `${hqDisplay}\n\n⚠️ **No Nations have been founded in this server yet.**`,
            color: '#FFA500',
            interaction,
            footer: true
        });
        return await replyV2(interaction, noNationsResponse, false);
    }

    // Build the select menu dropdown with all available nations
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`faction_hq_select_${faction.id}`)
        .setPlaceholder('Select a Nation to claim as HQ...')
        .addOptions(
            territories.slice(0, 25).map(t => ({
                label: t.name,
                description: `Claim ${t.name} as your Headquarters`,
                value: t.id.toString(),
                emoji: '📍'
            }))
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const hqResponse = ContainerService.create({
        title: `🛡️ ${faction.name} Headquarters`,
        description: hqDisplay,
        color: '#FFD700',
        components: [row],
        interaction,
        footer: true
    });

    return await replyV2(interaction, hqResponse, false);
  }
};
