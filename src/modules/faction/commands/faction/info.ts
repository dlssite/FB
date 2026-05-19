import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('info')
       .setDescription('View the public profile of a Faction.')
       .addStringOption(option => 
            option.setName('name')
                  .setDescription('The exact name of the Faction.')
                  .setRequired(true)
        ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const name = interaction.options.getString('name');


    try {
        const faction = await prisma.factions.findUnique({
            where: { guildId_name_tenantId: { guildId, name: name as string, tenantId } }
        });

        if (!faction) {
            return await interaction.editReply({ content: '❌ Could not find a Faction with that exact name.' });
        }

        const memberCount = await prisma.faction_members.count({
            where: { tenantId, guildId, factionId: faction.id }
        });

        let hqDisplay = 'Nomadic (No HQ Claimed)';
        if (faction.hqTerritoryId) {
            const territory = await prisma.transport_nations.findUnique({ where: { id: faction.hqTerritoryId } });
            if (territory) hqDisplay = `📍 ${territory.name}`;
        }

        // Count deployed buildings (We will use metadata for ownership)
        // Since Prisma can't easily query inside JSON directly for all databases uniformly, 
        // we'll fetch buildings in the HQ and filter in memory since the list is small.
        let buildingsCount = 0;
        if (faction.hqTerritoryId) {
            const hqBuildings = await prisma.territory_buildings.findMany({
                where: { tenantId, guildId, nationId: faction.hqTerritoryId }
            });
            buildingsCount = hqBuildings.filter(b => {
                const meta = b.metadata as any;
                return meta && meta.factionId === faction.id;
            }).length;
        }

        const perks = faction.perks as string[] || [];

        // Fetch Diplomacy
        const diplomacy = await prisma.guild_battles.findMany({
            where: {
                tenantId, guildId,
                OR: [{ challengerId: faction.id }, { defenderId: faction.id }]
            }
        });

        const rivalries = diplomacy.filter(d => d.status === 'pending');
        const alliances = diplomacy.filter(d => d.status === 'alliance');

        let rivalText = 'None';
        let allyText = 'None';

        if (rivalries.length > 0) {
            const rivalIds = rivalries.map(r => r.challengerId === faction.id ? r.defenderId : r.challengerId);
            const rivalFactions = await prisma.factions.findMany({ where: { id: { in: rivalIds } } });
            rivalText = rivalFactions.map(f => f.name).join(', ') || 'None';
        }

        if (alliances.length > 0) {
            const allyIds = alliances.map(a => a.challengerId === faction.id ? a.defenderId : a.challengerId);
            const allyFactions = await prisma.factions.findMany({ where: { id: { in: allyIds } } });
            allyText = allyFactions.map(f => f.name).join(', ') || 'None';
        }

        const response = ContainerService.create({
            title: `🛡️ Syndicate Profile: ${faction.name}`,
            description: `*"${faction.motto || 'For the cause.'}"*\n\n**Public Intelligence Report**`,
            color: '#7367F0',
            image: (faction as any).banner || undefined,
            fields: [
                { name: 'Headquarters', value: hqDisplay, inline: true },
                { name: 'Members', value: `${memberCount} active`, inline: true },
                { name: 'Deployed Structures', value: `${buildingsCount}`, inline: true },
                { name: 'Unlocked Tech', value: `${perks.length} Perks`, inline: true },
                { name: '⚔️ Rivalries', value: rivalText, inline: true },
                { name: '🤝 Alliances', value: allyText, inline: true },
            ],
            interaction,
            footer: true
        });

        await replyV2(interaction, response, true);
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Failed to load profile:** ${err.message}` });
    }
  }
};
