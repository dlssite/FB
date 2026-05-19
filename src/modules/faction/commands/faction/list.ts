import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('list')
       .setDescription('View the global Leaderboard of all Factions in the territory.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;



    try {
        const factions = await prisma.factions.findMany({
            where: { tenantId, guildId },
            orderBy: { bankBalance: 'desc' },
            take: 10
        });

        if (factions.length === 0) {
            return await interaction.editReply({ content: '❌ There are no Factions established in this territory yet.' });
        }

        let description = '**Global Syndicate Rankings**\n\n';

        for (let i = 0; i < factions.length; i++) {
            const f = factions[i];
            const memberCount = await prisma.faction_members.count({
                where: { tenantId, guildId, factionId: f.id }
            });
            
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🛡️';
            description += `${medal} **${f.name}**\n`;
            description += `> 💎 Bank: **${f.bankBalance.toLocaleString()}** | 👥 Members: **${memberCount}**\n\n`;
        }

        const response = ContainerService.create({
            title: '🌐 Faction Leaderboard',
            description,
            color: '#FFD700',
            interaction,
            footer: true
        });

        await replyV2(interaction, response, true);
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Failed to load leaderboard:** ${err.message}` });
    }
  }
};
