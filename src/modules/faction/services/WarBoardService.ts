import { prisma } from '../../../database/client';
import { AiService } from '../../ai/services/AiService';
import { Logger } from '../../../utils/logger';

const FALLBACK_BOUNTIES = [
    { description: 'Eliminate 50 hostile synthetics in the Outlands.', target: 50, reward: 5000 },
    { description: 'Extract 100 units of Raw Prismite from the Neutral Zone.', target: 100, reward: 12000 },
    { description: 'Intercept 20 smuggled cargo ships belonging to Rival Factions.', target: 20, reward: 8500 },
    { description: 'Establish 5 secure comm-relays in deep space.', target: 5, reward: 4000 },
    { description: 'Complete 10 industrial work cycles in the Forge.', target: 10, reward: 7500 }
];

export class WarBoardService {
    /**
     * Retrieves the active bounty for a faction. If none exists, generates a new one.
     */
    static async getActiveBounty(tenantId: string, guildId: string, factionId: number) {
        const activeBounty = await prisma.guild_quests.findFirst({
            where: {
                tenantId,
                guildId,
                factionId,
                currentAmount: { lt: prisma.guild_quests.fields.targetAmount }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (activeBounty) return activeBounty;

        return await this.generateNewBounty(tenantId, guildId, factionId);
    }

    /**
     * Generates a new War Board bounty using the Cognitive Engine (AI).
     * Falls back to a static list if the AI is offline or rate-limited.
     */
    private static async generateNewBounty(tenantId: string, guildId: string, factionId: number) {
        let bountyData = null;

        // 1. Fetch live server nations
        const nations = await prisma.transport_nations.findMany({
            where: { tenantId, guildId }
        });
        
        const randomNation = nations.length > 0 ? nations[Math.floor(Math.random() * nations.length)] : null;
        const nationPromptContext = randomNation 
            ? `The setting MUST take place in or mention the nation: "${randomNation.name}" (Description: "${(randomNation as any).description || 'A key faction hub in the galaxy.'}")`
            : `The setting should take place in deep space or a generic region.`;

        try {
            // Try generating via AI
            const prompt = `You are the War Board coordinator for a sci-fi syndicate. 
            Generate a single, short, immersive bounty mission for a faction to complete. 
            ${nationPromptContext}

            Respond ONLY with a JSON object in this exact format, with no markdown formatting or extra text:
            {"description": "A short 1-sentence immersive mission description that mentions the selected location/nation.", "target": <an integer between 5 and 100>, "reward": <an integer between 2000 and 15000>}`;

            const aiResponse = await AiService.generateSystemResponse(prompt);
            
            // Parse JSON response (clean any potential markdown code blocks first)
            const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            bountyData = JSON.parse(cleanJson);
            
            // Validate structure
            if (!bountyData.description || typeof bountyData.target !== 'number' || typeof bountyData.reward !== 'number') {
                throw new Error('AI returned invalid JSON structure.');
            }

        } catch (err) {
            Logger.warn(`[WarBoard] AI Generation failed, using fallback. Error: ${err}`);
            // Fallback to random static bounty
            const template = FALLBACK_BOUNTIES[Math.floor(Math.random() * FALLBACK_BOUNTIES.length)];
            let finalDesc = template.description;
            if (randomNation) {
                finalDesc = finalDesc
                    .replace('the Outlands', `the territory of ${randomNation.name}`)
                    .replace('the Neutral Zone', `the borders of ${randomNation.name}`)
                    .replace('deep space', `the spatial sector of ${randomNation.name}`)
                    .replace('the Forge', `the industrial yards of ${randomNation.name}`);
            }
            bountyData = {
                description: finalDesc,
                target: template.target,
                reward: template.reward
            };
        }

        // Save to DB
        return await prisma.guild_quests.create({
            data: {
                tenantId,
                guildId,
                factionId,
                description: bountyData.description,
                targetAmount: bountyData.target,
                currentAmount: 0,
                rewardGp: bountyData.reward,
                type: 'bounty',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    }

    /**
     * Progresses the active bounty by a given amount.
     */
    static async progressBounty(tenantId: string, guildId: string, factionId: number, amount: number) {
        const bounty = await this.getActiveBounty(tenantId, guildId, factionId);
        if (!bounty) return null;

        const newAmount = Math.min(bounty.currentAmount + amount, bounty.targetAmount);

        const updated = await prisma.guild_quests.update({
            where: { id: bounty.id },
            data: { 
                currentAmount: newAmount,
                updatedAt: new Date()
            }
        });

        // Check if just completed
        if (newAmount >= bounty.targetAmount && bounty.currentAmount < bounty.targetAmount) {
            // Reward the faction bank
            await prisma.factions.update({
                where: { id: factionId },
                data: { bankBalance: { increment: bounty.rewardGp } }
            });
            return { bounty: updated, completed: true, reward: bounty.rewardGp };
        }

        return { bounty: updated, completed: false, reward: 0 };
    }
}
