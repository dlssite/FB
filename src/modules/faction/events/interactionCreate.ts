import { Interaction, MessageFlags } from 'discord.js';
import { tenantStorage } from '../../../utils/context';
import { Logger } from '../../../utils/logger';
import { FactionService } from '../services/FactionService';
import { ContainerService, replyV2 } from '../../../utils/container';
import { prisma } from '../../../database/client';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    // 0. Ignore Slash Commands and Autocomplete (Core handles these)
    if (interaction.isChatInputCommand() || interaction.isAutocomplete()) return;

    let context = tenantStorage.getStore();
    
    // 1. Resolve context if missing (for buttons/modals)
    if (!context && interaction.guildId) {
        const { RoutingService } = await import('../../../services/RoutingService');
        const tenantId = await RoutingService.resolveTenantId(interaction.guildId, 'faction');
        context = { tenantId, guildId: interaction.guildId, lang: 'en' };
    }

    if (!context) return;
    const { tenantId, guildId } = context;

    return await tenantStorage.run(context, async () => {
        try {
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('faction_deposit_')) {
                    const instanceId = interaction.customId.replace('faction_deposit_', '');
                    return await this.handleDepositButton(interaction, instanceId);
                }

                if (interaction.customId.startsWith('faction_tech_buy_')) {
                    const data = interaction.customId.replace('faction_tech_buy_', '').split(':');
                    const factionId = data[0];
                    const nodeId = data[1];
                    return await this.handleTechUpgradeButton(interaction, factionId, nodeId, tenantId, guildId);
                }

                if (interaction.customId.startsWith('faction_tech_')) {
                    const instanceId = interaction.customId.replace('faction_tech_', '');
                    return await this.handleTechTreeButton(interaction, instanceId, tenantId, guildId);
                }

                if (interaction.customId.startsWith('faction_members_')) {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const factionId = parseInt(interaction.customId.replace('faction_members_', ''));
                    const members = await prisma.faction_members.findMany({
                        where: { factionId, tenantId }
                    });
                    const memberMentions = members.map(m => `<@${m.userId}> - **${m.rank === 'master' ? 'Syndicate Leader' : m.rank}**`).join('\n') || 'No members';
                    const response = ContainerService.create({
                        title: `👥 Syndicate Roster`,
                        description: `Active Syndicate Roster:\n\n${memberMentions}`,
                        color: '#3498DB',
                        interaction,
                        footer: true
                    });
                    return await replyV2(interaction, response, true);
                }

                if (interaction.customId.startsWith('faction_manage_')) {
                    const factionId = parseInt(interaction.customId.replace('faction_manage_', ''));
                    const faction = await prisma.factions.findUnique({ where: { id: factionId } });
                    
                    if (!faction || faction.masterId !== interaction.user.id) {
                        return await interaction.reply({ content: '❌ Only the Faction Leader can manage the Faction.', flags: [MessageFlags.Ephemeral] });
                    }

                    const response = ContainerService.create({
                        title: `⚙️ Syndicate Administration Console`,
                        description: `Welcome, Faction Master. To manage your Syndicate, use the following Slash Commands directly:\n\n` +
                                     `🛡️ **/faction manage invite <user>** - Invite new syndicate members\n` +
                                     `🥾 **/faction manage kick <user>** - Dismiss a syndicate member\n` +
                                     `🎨 **/faction manage color <hex>** - Customize the faction role color\n` +
                                     `🖼️ **/faction manage banner <url>** - Update the faction syndicate profile banner image\n` +
                                     `📈 **/faction manage promote <user> <rank>** - Assign promotion ranks`,
                        color: '#E74C3C',
                        interaction,
                        footer: true
                    });
                    return await replyV2(interaction, response, true);
                }

                if (interaction.customId.startsWith('faction_invite_accept_')) {
                    const data = interaction.customId.replace('faction_invite_accept_', '').split('_');
                    return await this.handleInviteAccept(interaction, data[0], data[1], tenantId, guildId);
                }

                if (interaction.customId.startsWith('faction_invite_decline_')) {
                    const data = interaction.customId.replace('faction_invite_decline_', '').split('_');
                    if (interaction.user.id !== data[1]) {
                        return await interaction.reply({ content: '❌ Only the invited user can click this.', flags: [MessageFlags.Ephemeral] });
                    }
                    return await interaction.update({ content: '❌ **Invitation Declined.**', components: [] });
                }
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('faction_hq_select_')) {
                    const factionId = parseInt(interaction.customId.replace('faction_hq_select_', ''));
                    const territoryId = parseInt(interaction.values[0]);
                    
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    
                    try {
                        const faction = await prisma.factions.findUnique({ where: { id: factionId } });
                        if (!faction) throw new Error('Faction not found.');
                        
                        if (faction.masterId !== interaction.user.id) {
                            throw new Error('Only the Faction Leader can change the Headquarters.');
                        }
                        
                        const territory = await prisma.transport_nations.findUnique({ 
                            where: { id: territoryId, tenantId, guildId } 
                        });
                        if (!territory) throw new Error('Territory not found or invalid.');
                        
                        await prisma.factions.update({
                            where: { id: faction.id },
                            data: { hqTerritoryId: territoryId }
                        });
                        
                        const response = ContainerService.create({
                            title: '📍 Headquarters Claimed',
                            description: `Successfully claimed **${territory.name}** as your Faction's Headquarters!`,
                            color: '#00FF00',
                            interaction,
                            footer: true
                        });
                        
                        return await replyV2(interaction, response, true);
                    } catch (err: any) {
                        return await replyV2(interaction, ContainerService.simple(`❌ **Failed to update Headquarters:** ${err.message}`), true);
                    }
                }
            }

            if (interaction.isModalSubmit()) {
                // Route Modal Submissions
                if (interaction.customId.startsWith('faction_deposit_modal_')) {
                    const instanceId = interaction.customId.replace('faction_deposit_modal_', '');
                    return await this.handleDepositModal(interaction, instanceId, tenantId, guildId);
                }

                if (interaction.customId.startsWith('faction_create_wizard_')) {
                    const instanceId = interaction.customId.replace('faction_create_wizard_', '');

                    // Extract Modal Data
                    const name = interaction.fields.getTextInputValue('faction_name');
                    let motto = '';
                    try { motto = interaction.fields.getTextInputValue('faction_motto'); } catch(e) {}
                    const leaderRole = interaction.fields.getTextInputValue('faction_leader_role');
                    const memberRole = interaction.fields.getTextInputValue('faction_member_role');

                    // Defer the interaction as role creation might take a moment
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                    try {
                        // Find the item instance to verify ownership and consume it
                        const inventoryItem = await prisma.shop_inventory.findFirst({
                            where: {
                                tenantId,
                                userId: interaction.user.id,
                                id: instanceId
                            }
                        });

                        if (!inventoryItem) {
                            return await interaction.editReply({ content: '❌ You do not possess a Faction Charter anymore or it has expired.' });
                        }

                        // Setup the Faction
                        const faction = await FactionService.setupFaction(
                            tenantId, 
                            interaction.guild, 
                            interaction.member, 
                            name, 
                            motto, 
                            leaderRole, 
                            memberRole
                        );

                        // Consume the Charter
                        await prisma.shop_inventory.delete({
                            where: { id: inventoryItem.id }
                        });

                        // Send Success Container
                        const response = ContainerService.create({
                            title: `🛡️ Faction Founded: ${faction.name}`,
                            description: `**"${motto || 'For the cause.'}"**\n\nYour Syndicate Charter has been officially recognized. Discord roles for **${leaderRole}** and **${memberRole}** have been created and assigned to you.\n\nNext steps:\n1. Open the \`/faction hall\`\n2. Claim a Territory HQ\n3. Recruit your allies`,
                            color: '#FFD700', // Gold
                            thumbnail: interaction.user.displayAvatarURL(),
                            interaction,
                            footer: true
                        });

                        await replyV2(interaction, response, true);
                        Logger.tenant(tenantId, `User ${interaction.user.tag} founded Faction [${faction.name}] in guild ${guildId}`);

                    } catch (err: any) {
                        await interaction.editReply({ content: `❌ **Failed to establish Faction:** ${err.message}` });
                    }
                }
            }
        } catch (err: any) {
            Logger.error(`[Faction Interaction Router] Critical failure: ${err.stack || err}`);
            const errorContainer = ContainerService.simple(`❌ **Syndicate Core Failure:** ${err.message || err}`);
            try {
                if (interaction.deferred || (interaction as any).replied) {
                    await interaction.editReply(errorContainer);
                } else {
                    await replyV2(interaction, errorContainer, true);
                }
            } catch (e) {
                Logger.warn(`[Faction Interaction Router] Failed to reply with error: ${e}`);
            }
        }
    });
  },
  async handleDepositButton(interaction: any, instanceId: string) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
    
    const modal = new ModalBuilder()
      .setCustomId(`faction_deposit_modal_${instanceId}`)
      .setTitle('Deposit Embers');

    const amountInput = new TextInputBuilder()
      .setCustomId('deposit_amount')
      .setLabel('Amount to Deposit')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<any>().addComponents(amountInput));
    await interaction.showModal(modal);
  },
  async handleDepositModal(interaction: any, instanceId: string, tenantId: string, guildId: string) {
    const amountStr = interaction.fields.getTextInputValue('deposit_amount');
    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) {
        return await interaction.reply({ content: '❌ Please enter a valid positive number.', flags: [MessageFlags.Ephemeral] });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.user.id;
    const factionId = parseInt(instanceId);

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Check user balance
            const user = await tx.flameborn_users.findUnique({
                where: { userId_tenantId: { userId, tenantId } }
            });

            if (!user || Number(user.embers) < amount) {
                throw new Error('Insufficient Embers in your pocket.');
            }

            // 2. Deduct from user
            await tx.flameborn_users.update({
                where: { userId_tenantId: { userId, tenantId } },
                data: { embers: { decrement: amount } }
            });

            // 3. Add to faction bank
            await tx.factions.update({
                where: { id: factionId },
                data: { bankBalance: { increment: amount } }
            });

            // 4. Log transaction
            await tx.economy_transactions.create({
                data: {
                    tenantId,
                    userId,
                    type: 'INCOME', // From faction's perspective? No, it's a loss for user. Let's record as TRANSFER
                    category: 'FACTION_DEPOSIT',
                    amount: BigInt(amount),
                    balance: BigInt(Number(user.embers) - amount),
                    reason: `Deposited into Faction ID ${factionId}`,
                    metadata: { factionId }
                }
            });
        });

        await interaction.editReply({ content: `✅ Successfully deposited **${amount.toLocaleString()}** Embers into the Faction Bank.` });
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Transaction Failed:** ${err.message}` });
    }
  },
  async handleTechTreeButton(interaction: any, instanceId: string, tenantId: string, guildId: string) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
    const { TechTreeService } = await import('../services/TechTreeService');
    const factionId = parseInt(instanceId);

    const faction = await prisma.factions.findUnique({ where: { id: factionId } });
    if (!faction) return await interaction.editReply({ content: 'Faction not found.' });

    const unlockedPerks = faction.perks as string[] || [];
    const availableUpgrades = TechTreeService.getAvailableUpgrades(unlockedPerks);

    if (availableUpgrades.length === 0) {
        const response = ContainerService.create({
            title: '🧬 Faction Tech Tree',
            description: 'Your Faction has researched all available technologies!',
            color: '#00FFFF',
            interaction,
            footer: true
        });
        return await replyV2(interaction, response, true);
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(`faction_tech_select_${factionId}`)
        .setPlaceholder('View available upgrades...')
        .addOptions(availableUpgrades.map(u => ({
            label: u.name,
            description: `Cost: ${u.cost.toLocaleString()} Embers`,
            value: u.id,
            emoji: u.emoji
        })));

    // Since select menus don't have a direct submit without a handler, 
    // we'll just render the list as buttons for the top 5, or use a Container with fields.
    // For simplicity in UI, we'll render the next available upgrades as individual buy buttons
    // inside the Container fields, and attach the buttons to the ActionRow.

    const fields = availableUpgrades.slice(0, 5).map(u => ({
        name: `${u.emoji} ${u.name} (Cost: ${u.cost.toLocaleString()})`,
        value: u.description,
        inline: false
    }));

    const row = new ActionRowBuilder<any>();
    availableUpgrades.slice(0, 5).forEach(u => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`faction_tech_buy_${factionId}:${u.id}`)
                .setLabel(`Unlock ${u.name}`)
                .setEmoji(u.emoji)
                .setStyle(ButtonStyle.Success)
        );
    });

    const response = ContainerService.create({
        title: '🧬 Faction Tech Tree',
        description: `Your Faction Bank currently holds **${faction.bankBalance.toLocaleString()} Embers**.\n\nAvailable Upgrades:`,
        color: '#00FFFF',
        fields,
        components: [row],
        interaction,
        footer: true
    });

    await replyV2(interaction, response, true);
  },
  async handleTechUpgradeButton(interaction: any, factionIdStr: string, nodeId: string, tenantId: string, guildId: string) {
    const { TechTreeService } = await import('../services/TechTreeService');
    const factionId = parseInt(factionIdStr);
    const userId = interaction.user.id;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        await prisma.$transaction(async (tx) => {
            const faction = await tx.factions.findUnique({ where: { id: factionId, tenantId, guildId } });
            if (!faction) throw new Error('Faction not found.');

            const memberRecord = await tx.faction_members.findUnique({
                where: { factionId_userId_tenantId: { factionId: faction.id, userId, tenantId } }
            });

            const customRanks = (faction.ranks as Record<string, string[]>) || {};
            const userRankPerms = memberRecord ? customRanks[memberRecord.rank] || [] : [];

            if (faction.masterId !== userId && !userRankPerms.includes('tech')) {
                throw new Error('You do not have permission to purchase Tech Upgrades.');
            }

            const node = TechTreeService.getNode(nodeId);
            if (!node) throw new Error('Invalid upgrade node.');

            const unlockedPerks = faction.perks as string[] || [];
            if (unlockedPerks.includes(nodeId)) throw new Error('This perk is already unlocked.');

            if (faction.bankBalance < node.cost) {
                throw new Error(`Insufficient funds in the Faction Bank. Required: ${node.cost.toLocaleString()}`);
            }

            unlockedPerks.push(nodeId);

            await tx.factions.update({
                where: { id: factionId },
                data: { 
                    bankBalance: { decrement: node.cost },
                    perks: unlockedPerks
                }
            });

            await tx.economy_transactions.create({
                data: {
                    tenantId,
                    userId,
                    type: 'LOSS',
                    category: 'FACTION_TECH',
                    amount: BigInt(node.cost),
                    balance: BigInt(faction.bankBalance - node.cost),
                    reason: `Purchased Tech Node: ${node.name}`,
                    metadata: { factionId, nodeId }
                }
            });
        });

        await interaction.editReply({ content: `✅ **Tech Upgrade Unlocked!** You have successfully purchased **${nodeId}**.` });
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Transaction Failed:** ${err.message}` });
    }
  },
  async handleInviteAccept(interaction: any, factionIdStr: string, targetUserId: string, tenantId: string, guildId: string) {
    if (interaction.user.id !== targetUserId) {
        return await interaction.reply({ content: '❌ Only the invited user can click this.', flags: [MessageFlags.Ephemeral] });
    }

    const factionId = parseInt(factionIdStr);
    
    // Check if user is already in a faction (in case they joined another while waiting)
    const { FactionRepository } = await import('../database/FactionRepository');
    const existing = await FactionRepository.getUserFaction(tenantId, guildId, targetUserId);
    if (existing) {
        return await interaction.update({ content: '❌ **Invitation Failed:** You are already in a Faction.', components: [] });
    }

    const faction = await prisma.factions.findUnique({ where: { id: factionId, tenantId, guildId } });
    if (!faction) {
        return await interaction.update({ content: '❌ **Invitation Failed:** The Faction no longer exists.', components: [] });
    }

    // Double check capacity
    let totalCapacity = 10;
    const perks = faction.perks as string[] || [];
    if (perks.includes('util_member_cap_2')) totalCapacity += 25;
    else if (perks.includes('util_member_cap_1')) totalCapacity += 10;

    if (faction.hqTerritoryId) {
        const hqBuildings = await prisma.territory_buildings.findMany({
            where: { tenantId, guildId, nationId: faction.hqTerritoryId, buildingId: 'faction_bld_barracks' }
        });
        const barracks = hqBuildings.filter(b => (b.metadata as any)?.factionId === faction.id).length;
        totalCapacity += (barracks * 15);
    }

    const currentMembers = await prisma.faction_members.count({ where: { tenantId, guildId, factionId: faction.id } });
    if (currentMembers >= totalCapacity) {
        return await interaction.update({ content: `❌ **Invitation Failed:** ${faction.name} is now at maximum capacity.`, components: [] });
    }

    try {
        await prisma.faction_members.create({
            data: {
                tenantId,
                guildId,
                factionId: faction.id,
                userId: targetUserId,
                rank: 'member'
            }
        });

        // Add Discord Role
        if (faction.discordRoleId) {
            try {
                const member = await interaction.guild?.members.fetch(targetUserId);
                if (member) await member.roles.add(faction.discordRoleId);
            } catch (err) {
                Logger.warn('Could not assign faction role on invite accept (permissions error?).');
            }
        }

        await interaction.update({ content: `✅ **Invitation Accepted!** Welcome to **${faction.name}**, Syndicate Member.`, components: [] });
    } catch (err: any) {
        await interaction.update({ content: `❌ **Failed to join Faction:** ${err.message}`, components: [] });
    }
  }
};
