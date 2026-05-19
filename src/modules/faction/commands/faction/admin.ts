import { SlashCommandSubcommandGroupBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { FactionService } from '../../services/FactionService';
import { prisma } from '../../../../database/client';

export default {
  isGroup: true,
  data: (group: SlashCommandSubcommandGroupBuilder) =>
    group.setName('admin')
         .setDescription('🔧 Administrative Faction Management.')
         .addSubcommand(sub =>
            sub.setName('register')
               .setDescription('Forcefully register a new Faction.')
               .addUserOption(opt => opt.setName('master').setDescription('Owner of the Faction').setRequired(true))
               .addStringOption(opt => opt.setName('name').setDescription('Faction Name').setRequired(true))
               .addStringOption(opt => opt.setName('motto').setDescription('Faction Motto').setRequired(false))
               .addStringOption(opt => opt.setName('leader_role').setDescription('Custom Leader Title (default: Leader)').setRequired(false))
               .addStringOption(opt => opt.setName('member_role').setDescription('Custom Member Title (default: Member)').setRequired(false))
         )
         .addSubcommand(sub =>
            sub.setName('delete')
               .setDescription('Disband and completely delete a Faction.')
               .addStringOption(opt => opt.setName('name').setDescription('Exact Faction Name').setRequired(true))
         )
         .addSubcommand(sub =>
            sub.setName('edit')
               .setDescription('Manually edit Faction parameters.')
               .addStringOption(opt => opt.setName('name').setDescription('Exact Faction Name to edit').setRequired(true))
               .addStringOption(opt => opt.setName('motto').setDescription('New Motto').setRequired(false))
               .addStringOption(opt => opt.setName('banner').setDescription('New Banner Image URL').setRequired(false))
               .addIntegerOption(opt => opt.setName('bank').setDescription('Set Bank Balance').setRequired(false))
               .addUserOption(opt => opt.setName('master').setDescription('Transfer Leadership to this user').setRequired(false))
         )
         .addSubcommand(sub =>
            sub.setName('settings')
               .setDescription('Configure Faction role hierarchy placement settings.')
               .addRoleOption(opt => opt.setName('header').setDescription('Separator role below which new faction roles are created').setRequired(false))
               .addRoleOption(opt => opt.setName('footer').setDescription('Separator role above which new faction roles are created').setRequired(false))
         ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    // 1. Strictly enforce server Administrator permission check
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.editReply({ content: '❌ You do not have permission to execute Faction Administrative commands.' });
    }

    const sub = interaction.options.getSubcommand();

    try {
        if (sub === 'register') {
            const masterUser = interaction.options.getUser('master', true);
            const factionName = interaction.options.getString('name', true);
            const motto = interaction.options.getString('motto') || 'For the cause.';
            const leaderTitle = interaction.options.getString('leader_role') || 'Leader';
            const memberTitle = interaction.options.getString('member_role') || 'Member';

            // 1. Check if name is taken
            const existing = await FactionRepository.getFactionByName(tenantId, guildId, factionName);
            if (existing) {
                return await interaction.editReply({ content: `❌ **Failed to register Faction:** A faction named **${factionName}** already exists.` });
            }

            // 2. Check if user is already in a faction
            const userFaction = await FactionRepository.getUserFaction(tenantId, guildId, masterUser.id);
            if (userFaction) {
                return await interaction.editReply({ content: `❌ **Failed to register Faction:** <@${masterUser.id}> is already a member of **${userFaction.name}**.` });
            }

            // 3. Setup Discord Roles
            let memberRole;
            let leaderRole;
            try {
                memberRole = await interaction.guild?.roles.create({
                    name: `${factionName} - ${memberTitle}`,
                    color: 'Default',
                    reason: `Admin registered Faction: ${factionName}`
                });

                leaderRole = await interaction.guild?.roles.create({
                    name: `${factionName} - ${leaderTitle}`,
                    color: 'Gold',
                    reason: `Admin registered Faction Leader: ${factionName}`
                });
            } catch (err) {
                return await interaction.editReply({ content: '❌ **Failed to create Discord roles.** Please verify the bot has Manage Roles permission.' });
            }

            // Position Roles
            if (memberRole && leaderRole && interaction.guild) {
                await FactionService.positionFactionRoles(tenantId, interaction.guild, memberRole, leaderRole);
            }

            // 4. Save to DB
            const faction = await FactionRepository.createFaction(
                tenantId,
                guildId,
                factionName,
                motto,
                masterUser.id,
                leaderTitle,
                memberTitle,
                memberRole?.id || '',
                leaderRole?.id || ''
            );

            // Assign Roles to the Master User
            try {
                const masterMember = await interaction.guild?.members.fetch(masterUser.id);
                if (masterMember) {
                    if (memberRole) await masterMember.roles.add(memberRole.id);
                    if (leaderRole) await masterMember.roles.add(leaderRole.id);
                }
            } catch (e) {}

            const response = ContainerService.create({
                title: `🛡️ Admin: Faction Registered`,
                description: `Successfully founded faction **${faction.name}** for <@${masterUser.id}>.\n\nLeader Rank: **${leaderTitle}**\nMember Rank: **${memberTitle}**`,
                color: '#FF00FF',
                interaction,
                footer: true
            });

            return await replyV2(interaction, response, false);
        }

        if (sub === 'delete') {
            const factionName = interaction.options.getString('name', true);
            const faction = await FactionRepository.getFactionByName(tenantId, guildId, factionName);

            if (!faction) {
                return await interaction.editReply({ content: `❌ Faction **${factionName}** not found.` });
            }

            // Remove Faction Members
            await prisma.faction_members.deleteMany({
                where: { factionId: faction.id, tenantId }
            });

            // Disband HQ Territory Claim if any
            if (faction.hqTerritoryId) {
                // Remove buildings
                await prisma.territory_buildings.deleteMany({
                    where: { tenantId, guildId, nationId: faction.hqTerritoryId }
                });
                // Remove territory claims or reset ownership
                await prisma.transport_nations.update({
                    where: { id: faction.hqTerritoryId },
                    data: { sovereignFactionId: null }
                });
            }

            // Delete Discord Roles
            try {
                if (faction.discordRoleId) await interaction.guild?.roles.cache.get(faction.discordRoleId)?.delete('Admin Faction Disband');
                if (faction.discordLeaderId) await interaction.guild?.roles.cache.get(faction.discordLeaderId)?.delete('Admin Faction Disband');
            } catch (e) {}

            // Delete Faction itself
            await prisma.factions.delete({
                where: { id: faction.id }
            });

            return await interaction.editReply({ content: `✅ **Faction Disbanded:** The Syndicate **${faction.name}** .` });
        }

        if (sub === 'edit') {
            const factionName = interaction.options.getString('name', true);
            const faction = await FactionRepository.getFactionByName(tenantId, guildId, factionName);

            if (!faction) {
                return await interaction.editReply({ content: `❌ Faction **${factionName}** not found.` });
            }

            const newMotto = interaction.options.getString('motto');
            const newBanner = interaction.options.getString('banner');
            const newBank = interaction.options.getInteger('bank');
            const newMaster = interaction.options.getUser('master');

            const updates: any = {};

            if (newMotto !== null) updates.motto = newMotto;
            if (newBanner !== null) {
                if (!newBanner.startsWith('http://') && !newBanner.startsWith('https://') && newBanner !== '') {
                    return await interaction.editReply({ content: '❌ Invalid banner URL. Must start with http/https.' });
                }
                updates.banner = newBanner === '' ? null : newBanner;
            }
            if (newBank !== null) updates.bankBalance = newBank;
            if (newMaster !== null) {
                // Check if new master is in the faction
                const memberRecord = await prisma.faction_members.findFirst({
                    where: { factionId: faction.id, userId: newMaster.id, tenantId }
                });

                if (!memberRecord) {
                    // Force add them as a member first
                    await prisma.faction_members.create({
                        data: {
                            tenantId,
                            guildId,
                            factionId: faction.id,
                            userId: newMaster.id,
                            rank: 'master'
                        }
                    });
                } else {
                    // Update rank
                    await prisma.faction_members.update({
                        where: { factionId_userId_tenantId: { factionId: faction.id, userId: newMaster.id, tenantId } },
                        data: { rank: 'master' }
                    });
                }

                // Downgrade old master rank in db
                await prisma.faction_members.updateMany({
                    where: { factionId: faction.id, userId: faction.masterId, tenantId },
                    data: { rank: 'member' }
                });

                updates.masterId = newMaster.id;
            }

            await prisma.factions.update({
                where: { id: faction.id },
                data: updates
            });

            return await interaction.editReply({ content: `✅ **Faction Edited Successfully!** Administrative changes applied to **${faction.name}**.` });
        }

        if (sub === 'settings') {
            const headerRole = interaction.options.getRole('header');
            const footerRole = interaction.options.getRole('footer');

            if (!headerRole && !footerRole) {
                return await interaction.editReply({ content: '❌ Please specify at least one role (`header` or `footer`) to configure.' });
            }

            const updates: any = {};
            if (headerRole !== null) updates.factionHeaderRoleId = headerRole.id;
            if (footerRole !== null) updates.factionFooterRoleId = footerRole.id;

            await prisma.guild_settings.upsert({
                where: { guildId_tenantId: { guildId, tenantId } },
                update: updates,
                create: {
                    guildId,
                    tenantId,
                    factionHeaderRoleId: headerRole?.id || null,
                    factionFooterRoleId: footerRole?.id || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            let responseDesc = 'Faction Role placement settings have been updated successfully:\n\n';
            if (headerRole) responseDesc += `🛡️ **Faction Header:** <@&${headerRole.id}> (New faction roles will be positioned directly below this role)\n`;
            if (footerRole) responseDesc += `🛡️ **Faction Footer:** <@&${footerRole.id}> (New faction roles will be positioned directly above this role)\n`;

            return await interaction.editReply({ content: `✅ **Settings Updated!**\n\n${responseDesc}` });
        }

    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Administrative Operation Failed:** ${err.message}` });
    }
  }
};
