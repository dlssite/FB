import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { FactionRepository } from '../../database/FactionRepository';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('leave')
       .setDescription('Leave your current Faction.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    try {
        const myFaction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);
        if (!myFaction) {
            return await interaction.editReply({ content: '❌ You are not in a Faction.' });
        }

        if (myFaction.masterId === interaction.user.id) {
            return await interaction.editReply({ content: '❌ The Faction Leader cannot leave. You must transfer leadership or disband the Faction first.' });
        }

        // Remove from DB
        await prisma.faction_members.delete({
            where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: interaction.user.id, tenantId } }
        });

        // Remove Discord Roles
        try {
            if (myFaction.discordRoleId) {
                const discordMember = await interaction.guild?.members.fetch(interaction.user.id);
                if (discordMember) {
                    await discordMember.roles.remove(myFaction.discordRoleId);
                }
            }
        } catch (e) { /* Ignore permissions error */ }

        return await interaction.editReply({ content: `👋 You have successfully left the Faction **${myFaction.name}**.` });
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Failed to leave Faction:** ${err.message}` });
    }
  }
};
