import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { EconomyRepository } from '../database/EconomyRepository';
import { MarketEngine } from '../services/MarketEngine';
import { VaultService } from '../services/VaultService';
import { Translator } from '../../../core/Translator';
import { tenantStorage } from '../../../utils/context';

export class EconomyProfileProvider implements ProfileProvider {
  moduleName = 'economy';
  priority = 10; // High priority, appears right after identity

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const [user, inventory, rank] = await Promise.all([
      EconomyRepository.getUser(tenantId, userId),
      EconomyRepository.getInventory(tenantId, userId),
      EconomyRepository.getUserRank(tenantId, userId)
    ]);

    // Calculate Portfolio Value
    let portfolioValue = 0;
    const resourceStrings: string[] = [];
    
    for (const item of inventory) {
      try {
        const marketRes = await MarketEngine.getResource(item.itemName, 100);
        const totalVal = item.quantity * marketRes.currentPrice;
        portfolioValue += totalVal;
        resourceStrings.push(`• ${marketRes.name}: \`${item.quantity}\` (≈${totalVal.toLocaleString()} 💠)`);
      } catch (err) {
        // Fallback for non-market items
        resourceStrings.push(`• ${item.itemName}: \`${item.quantity}\``);
      }
    }
    const resources = resourceStrings.join('\n');

    const vault = VaultService.getVault(user?.bankType || 'prism_ledger');

    // We assume viewing from profile:view command context where targetUser is checked against interaction.user
    // If vault is hidden, we let the user know it's secured unless they are the owner
    const isOwner = context?.userId === userId;
    const vaultBal = (vault.hidden && !isOwner) 
      ? Translator.t('economy', 'balance.secured', lang) 
      : Number(user?.emberVault || 0).toLocaleString();

    return [
      { 
        name: `${Translator.t('economy', 'profile.liquid_savings', lang)} | Rank: \`#${rank > 0 ? rank : 'N/A'}\` ${rank === 1 ? '👑 (Top Merchant)' : ''}`, 
        value: `${Translator.t('economy', 'profile.embers', lang)}: \`${Number(user?.embers || 0).toLocaleString()}\`\n${Translator.t('economy', 'profile.vault', lang)}: \`${vaultBal}\``, 
        inline: true 
      },
      { 
        name: Translator.t('economy', 'profile.account_type', lang), 
        value: `**${Translator.t('economy', `vault.types.${vault.id}.name`, lang)}**\n${Translator.t('economy', 'profile.interest_label', lang)}: \`${(vault.interestRate * 100).toFixed(1)}%/day\``, 
        inline: true 
      },
      { 
        name: Translator.t('economy', 'profile.portfolio', lang), 
        value: resources || Translator.t('economy', 'profile.no_resources', lang), 
        inline: false 
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    const [user, inventory] = await Promise.all([
      EconomyRepository.getUser(tenantId, userId),
      EconomyRepository.getInventory(tenantId, userId)
    ]);

    return {
      embers: Number(user?.embers || 0),
      flamebornRuby: Number(user?.flamebornRuby || 0),
      emberVault: Number(user?.emberVault || 0),
      bankType: user?.bankType || 'prism_ledger',
      inventory: inventory.map(i => ({ item: i.itemName, quantity: i.quantity }))
    };
  }
}
