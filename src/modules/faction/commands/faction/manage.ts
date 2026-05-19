import { SlashCommandSubcommandGroupBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { prisma } from '../../../../database/client';

export default {
  isGroup: true,
  data: (group: SlashCommandSubcommandGroupBuilder) =>
    group.setName('manage')
         .setDescription('Manage your Faction members and settings.')
         .addSubcommand(sub => 
            sub.setName('invite')
               .setDescription('Invite a user to join your Faction.')
               .addUserOption(opt => opt.setName('user').setDescription('The user to invite').setRequired(true))
         )
         .addSubcommand(sub => 
            sub.setName('kick')
               .setDescription('Kick a member from your Faction.')
               .addUserOption(opt => opt.setName('user').setDescription('The member to kick').setRequired(true))
         )
         .addSubcommand(sub => 
            sub.setName('leave')
               .setDescription('Leave your current Faction.')
         )
         .addSubcommand(sub => 
            sub.setName('banner')
               .setDescription('Set a custom banner image URL for your Faction.')
               .addStringOption(opt => opt.setName('url').setDescription('URL of the image (starting with http/https)').setRequired(true))
         )
         .addSubcommand(sub => 
            sub.setName('color')
               .setDescription('Change the Faction Role color (Requires Syndicate Colors perk).')
               .addStringOption(opt => opt.setName('hex').setDescription('Hex color code (e.g. #FF0000)').setRequired(true))
         )
         .addSubcommand(sub => 
            sub.setName('rank_create')
               .setDescription('Define a new custom rank and its permissions.')
               .addStringOption(opt => opt.setName('name').setDescription('Rank Name (e.g. Quartermaster)').setRequired(true))
               .addStringOption(opt => opt.setName('permissions').setDescription('Comma-separated: vault, tech, raid, war').setRequired(true))
         )
         .addSubcommand(sub => 
            sub.setName('promote')
               .setDescription('Assign a custom rank to a member.')
               .addUserOption(opt => opt.setName('user').setDescription('Member to promote').setRequired(true))
               .addStringOption(opt => opt.setName('rank').setDescription('The rank name to assign').setRequired(true))
         ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const sub = interaction.options.getSubcommand();
    const myFaction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);



    try {
        if (sub === 'leave') {
            if (!myFaction) return await interaction.editReply({ content: '❌ You are not in a Faction.' });
            if (myFaction.masterId === interaction.user.id) {
                return await interaction.editReply({ content: '❌ The Faction Leader cannot leave. You must transfer leadership or disband the Faction (coming soon).' });
            }

            // Remove from DB
            await prisma.faction_members.delete({
                where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: interaction.user.id, tenantId } }
            });

            // Remove Discord Roles
            try {
                if (myFaction.discordRoleId) await interaction.guild?.members.cache.get(interaction.user.id)?.roles.remove(myFaction.discordRoleId);
            } catch (e) { /* Ignore permissions error */ }

            return await interaction.editReply({ content: `👋 You have left **${myFaction.name}**.` });
        }

        if (!myFaction) {
            return await interaction.editReply({ content: '❌ You must be in a Faction to manage it.' });
        }

        if (myFaction.masterId !== interaction.user.id) {
            return await interaction.editReply({ content: '❌ Only the Faction Leader can use management commands.' });
        }

        if (sub === 'banner') {
            const url = interaction.options.getString('url') as string;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return await interaction.editReply({ content: '❌ Invalid URL. The banner URL must start with `http://` or `https://`.' });
            }

            await prisma.factions.update({
                where: { id: myFaction.id },
                data: { banner: url }
            });

            return await interaction.editReply({ content: `✅ **Faction Banner Updated!** Your new syndicate banner has been registered successfully.` });
        }

        if (sub === 'invite') {
            const targetUser = interaction.options.getUser('user');
            if (!targetUser || targetUser.bot) return await interaction.editReply({ content: '❌ Invalid user.' });

            const targetFaction = await FactionRepository.getUserFaction(tenantId, guildId, targetUser.id);
            if (targetFaction) {
                return await interaction.editReply({ content: `❌ **${targetUser.username}** is already in a Faction.` });
            }

            // Calculate Capacity
            let totalCapacity = 10;
            const perks = myFaction.perks as string[] || [];
            if (perks.includes('util_member_cap_2')) totalCapacity += 25;
            else if (perks.includes('util_member_cap_1')) totalCapacity += 10;

            if (myFaction.hqTerritoryId) {
                const hqBuildings = await prisma.territory_buildings.findMany({
                    where: { tenantId, guildId, nationId: myFaction.hqTerritoryId, buildingId: 'faction_bld_barracks' }
                });
                const barracks = hqBuildings.filter(b => (b.metadata as any)?.factionId === myFaction.id).length;
                totalCapacity += (barracks * 15);
            }

            const currentMembers = await prisma.faction_members.count({ where: { tenantId, guildId, factionId: myFaction.id } });
            if (currentMembers >= totalCapacity) {
                return await interaction.editReply({ content: `❌ Your Faction is at maximum capacity (${totalCapacity}). You must upgrade your Barracks to invite more members.` });
            }

            // Send Interactive Invite
            const row = new ActionRowBuilder<any>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`faction_invite_accept_${myFaction.id}_${targetUser.id}`)
                    .setLabel('Accept Invitation')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`faction_invite_decline_${myFaction.id}_${targetUser.id}`)
                    .setLabel('Decline')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ content: `✅ Invitation sent to <@${targetUser.id}>. Waiting for their response...` });
            await (interaction.channel as any)?.send({
                content: `<@${targetUser.id}>, you have been invited to join the Syndicate **${myFaction.name}** by <@${interaction.user.id}>!`,
                components: [row]
            });
        }

        if (sub === 'kick') {
            const targetUser = interaction.options.getUser('user');
            if (!targetUser) return await interaction.editReply({ content: '❌ Invalid user.' });
            if (targetUser.id === interaction.user.id) return await interaction.editReply({ content: '❌ You cannot kick yourself.' });

            const targetMember = await prisma.faction_members.findUnique({
                where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: targetUser.id, tenantId } }
            });

            if (!targetMember) {
                return await interaction.editReply({ content: `❌ **${targetUser.username}** is not in your Faction.` });
            }

            // Remove from DB
            await prisma.faction_members.delete({
                where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: targetUser.id, tenantId } }
            });

            // Remove Discord Roles
            try {
                const discordMember = await interaction.guild?.members.fetch(targetUser.id);
                if (discordMember && myFaction.discordRoleId) {
                    await discordMember.roles.remove(myFaction.discordRoleId);
                }
            } catch (e) { /* Ignore permissions error */ }

            return await interaction.editReply({ content: `✅ **${targetUser.username}** has been kicked from the Faction.` });
        }

        if (sub === 'color') {
            const hex = interaction.options.getString('hex') as string;
            if (!/^#[0-9A-F]{6}$/i.test(hex)) {
                return await interaction.editReply({ content: '❌ Invalid Hex color. Example: `#FF0000`' });
            }

            const perks = myFaction.perks as string[] || [];
            if (!perks.includes('soc_custom_colors')) {
                return await interaction.editReply({ content: '❌ Your Faction has not unlocked the **Syndicate Colors** perk in the Tech Tree.' });
            }

            try {
                if (myFaction.discordRoleId) {
                    const memberRole = interaction.guild?.roles.cache.get(myFaction.discordRoleId);
                    if (memberRole) await memberRole.setColor(hex as ColorResolvable, 'Faction Perk: Custom Color');
                }
                if (myFaction.discordLeaderId) {
                    const leaderRole = interaction.guild?.roles.cache.get(myFaction.discordLeaderId);
                    if (leaderRole) await leaderRole.setColor(hex as ColorResolvable, 'Faction Perk: Custom Color');
                }
                await interaction.editReply({ content: `🎨 Faction Roles have been updated to **${hex}**.` });
            } catch (err) {
                await interaction.editReply({ content: '❌ Failed to update Discord Role colors. Check bot permissions (needs Manage Roles and role hierarchy must be correct).' });
            }
        }

        if (sub === 'rank_create') {
            const rankName = interaction.options.getString('name') as string;
            const permsInput = interaction.options.getString('permissions') as string;
            
            const validPerms = ['vault', 'tech', 'raid', 'war'];
            const chosenPerms = permsInput.split(',').map(p => p.trim().toLowerCase()).filter(p => validPerms.includes(p));

            if (chosenPerms.length === 0) {
                return await interaction.editReply({ content: '❌ Invalid permissions. Choose from: `vault, tech, raid, war`.' });
            }

            const currentRanks = (myFaction.ranks as Record<string, string[]>) || {};
            currentRanks[rankName] = chosenPerms;

            await prisma.factions.update({
                where: { id: myFaction.id },
                data: { ranks: currentRanks }
            });

            return await interaction.editReply({ content: `✅ Created rank **${rankName}** with permissions: ${chosenPerms.join(', ')}.` });
        }

        if (sub === 'promote') {
            const targetUser = interaction.options.getUser('user');
            const rankName = interaction.options.getString('rank') as string;

            if (!targetUser) return await interaction.editReply({ content: '❌ Invalid user.' });

            const currentRanks = (myFaction.ranks as Record<string, string[]>) || {};
            if (!currentRanks[rankName] && rankName !== 'member') {
                return await interaction.editReply({ content: `❌ The rank **${rankName}** does not exist. Use \`/faction manage rank_create\` first.` });
            }

            const memberRecord = await prisma.faction_members.findUnique({
                where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: targetUser.id, tenantId } }
            });

            if (!memberRecord) {
                return await interaction.editReply({ content: `❌ **${targetUser.username}** is not in your Faction.` });
            }

            await prisma.faction_members.update({
                where: { factionId_userId_tenantId: { factionId: myFaction.id, userId: targetUser.id, tenantId } },
                data: { rank: rankName }
            });

            return await interaction.editReply({ content: `✅ **${targetUser.username}** has been promoted to **${rankName}**.` });
        }

    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Management Action Failed:** ${err.message}` });
    }
  }
};
