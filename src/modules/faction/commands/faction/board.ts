import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { FactionRepository } from '../../database/FactionRepository';
import { WarBoardService } from '../../services/WarBoardService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('board')
       .setDescription('View the active Faction Bounty on the War Board.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    // Fetch User's Faction
    const faction = await FactionRepository.getUserFaction(tenantId, guildId, interaction.user.id);

    if (!faction) {
        return await replyV2(interaction, ContainerService.create({ description: '❌ You must be in a Faction to view the War Board.', interaction }), true);
    }

    try {
        const bounty = await WarBoardService.getActiveBounty(tenantId, guildId, faction.id);

        const progressPercent = Math.min(100, Math.floor((bounty.currentAmount / bounty.targetAmount) * 100));
        
        // Build progress bar
        const totalBlocks = 10;
        const filledBlocks = Math.floor(progressPercent / 10);
        const progressBar = '🟩'.repeat(filledBlocks) + '⬛'.repeat(totalBlocks - filledBlocks);

        const boardResponse = ContainerService.create({
            title: `📋 ${faction.name} War Board`,
            description: `**Current Syndicate Directive:**\n*${bounty.description}*\n\n**Progress:** [${bounty.currentAmount} / ${bounty.targetAmount}]\n${progressBar} ${progressPercent}%\n\n**Reward:** 💎 ${bounty.rewardGp.toLocaleString()} Embers to the Faction Bank\n\n**How to Complete:**\nSyndicate Members can progress this directive by using the \`/faction expedition\` or \`/faction raid\` commands to interact with the target locations and adversaries. Progress is tracked automatically by the Cognitive Engine.`,
            color: '#FF4500', // Orange-Red for War Board
            thumbnail: 'https://placehold.co/100x100/FF4500/FFFFFF.png?text=WAR+BOARD',
            interaction,
            footer: true
        });

        await replyV2(interaction, boardResponse, true);
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Failed to access War Board:** ${err.message}` });
    }
  }
};
