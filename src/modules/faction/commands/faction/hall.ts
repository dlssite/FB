import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('hall')
       .setDescription('Enter the Faction Hall to view stats and manage your syndicate.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    // 1. Fetch User's Faction
    const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);

    if (!faction) {
        const noFactionResponse = ContainerService.create({
            title: '🛡️ Neutral Citizen',
            description: 'You are not currently bound to any Faction.\n\nTo join a Faction, you must receive an invite from a Faction Leader. To found your own Faction, you must purchase a **Faction Charter** from the `/shop`.',
            color: '#A9A9A9',
            interaction,
            footer: true
        });
        return await replyV2(interaction, noFactionResponse, false);
    }

    // 2. Fetch Extra Stats (Member Count, HQ)
    const memberCount = await prisma.faction_members.count({
        where: { tenantId, guildId, factionId: faction.id }
    });

    let hqDisplay = 'Nomadic (No HQ Claimed)';
    let totalCapacity = 10; // Base capacity
    
    // Tech Tree Capacity
    const perks = faction.perks as string[] || [];
    if (perks.includes('util_member_cap_2')) totalCapacity += 25;
    else if (perks.includes('util_member_cap_1')) totalCapacity += 10;

    if (faction.hqTerritoryId) {
        const territory = await prisma.transport_nations.findUnique({ where: { id: faction.hqTerritoryId } });
        if (territory) {
            hqDisplay = `📍 ${territory.name}`;
            
            // Add capacity from deployed Barracks
            const hqBuildings = await prisma.territory_buildings.findMany({
                where: { 
                    tenantId, guildId, nationId: faction.hqTerritoryId, buildingId: 'faction_bld_barracks'
                }
            });
            const barracks = hqBuildings.filter(b => {
                const meta = b.metadata as any;
                return meta && meta.factionId === faction.id;
            }).length;
            totalCapacity += (barracks * 15);
        }
    }

    // 3. Build the UI
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`faction_deposit_${faction.id}`)
            .setLabel('Deposit Embers')
            .setEmoji('💎')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`faction_tech_${faction.id}`)
            .setLabel('Tech Tree')
            .setEmoji('🧬')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`faction_members_${faction.id}`)
            .setLabel('Member List')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Secondary)
    );

    const leaderOnlyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`faction_manage_${faction.id}`)
            .setLabel('Manage Faction')
            .setEmoji('⚙️')
            .setStyle(ButtonStyle.Danger)
    );

    const components = [row];
    if (interaction.user.id === faction.masterId) {
        components.push(leaderOnlyRow);
    }

    const hallResponse = ContainerService.create({
        title: `🛡️ ${faction.name} | Faction Hall`,
        description: `*"${faction.motto || 'For the cause.'}"*\n\n**Welcome to the Syndicate Hall, <@${interaction.user.id}>.**`,
        color: '#FFD700',
        thumbnail: interaction.guild?.iconURL() || undefined,
        fields: [
            { name: 'Headquarters', value: hqDisplay, inline: true },
            { name: 'Members', value: `${memberCount} / ${totalCapacity} active`, inline: true },
            { name: 'Bank Balance', value: `${faction.bankBalance.toLocaleString()} Embers 💎`, inline: false },
        ],
        components,
        interaction,
        footer: true
    });

    await replyV2(interaction, hallResponse, false);
  }
};
