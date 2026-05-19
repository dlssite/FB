import { EconomyRepository } from '../database/EconomyRepository';
import { flamebornConfig } from '../../../config/flameborn.config';

export interface VaultType {
  id: string;
  name: string;
  description: string;
  interestRate: number; // Daily percentage
  depositFee: number;   // Percentage
  withdrawFee: number;  // Percentage
  lockDuration?: number; // Hours
  robResistance?: number; // Percentage reduction in stolen amount
  hackDifficulty?: number; // Extra characters for attacker minigame
  insurance?: number;    // Percentage of stolen funds recovered
  banner?: string;       // Custom banner URL
  transferFee: number;   // Percentage fee for wire transfers
  hidden?: boolean;      // Whether vault balance is hidden
}

export class VaultService {
  static vaults: Record<string, VaultType> = {
    'prism_ledger': {
      id: 'prism_ledger',
      name: 'Prism Ledger Cooperative',
      description: 'A stable, crystal-synced account for everyday citizens. Secure and transparent.',
      interestRate: 0,
      depositFee: 0,
      withdrawFee: 0,
      banner: flamebornConfig.economy.assets.vaultBanners.prism_ledger,
      transferFee: 0.05 // 5%
    },
    'obsidian_fortress': {
      id: 'obsidian_fortress',
      name: 'Obsidian Fortress Vault',
      description: 'Reinforced with tectonic-grade obsidian. Near impossible to crack from the outside.',
      interestRate: 0.005, // 0.5% daily
      depositFee: 0.02,   // 2% fee
      withdrawFee: 0,
      robResistance: 0.4, // 40% less stolen
      banner: flamebornConfig.economy.assets.vaultBanners.obsidian_fortress,
      transferFee: 0.08 // 8% (High security overhead)
    },
    'nova_fusion': {
      id: 'nova_fusion',
      name: 'Nova Fusion Reactor',
      description: 'Harnesses high-frequency ember oscillation to generate massive yields.',
      interestRate: 0.012, // 1.2% daily
      depositFee: 0,
      withdrawFee: 0.05,  // 5% fee
      lockDuration: 24,
      banner: flamebornConfig.economy.assets.vaultBanners.nova_fusion,
      transferFee: 0.03 // 3% (Optimized routing)
    },
    'void_stitch': {
      id: 'void_stitch',
      name: 'Void-Stitch Stealth Cell',
      description: 'Woven into the dark matter fabric. Your assets exist where light cannot reach.',
      interestRate: 0,
      depositFee: 0.03, // 3% privacy fee
      withdrawFee: 0,
      hidden: true,
      hackDifficulty: 2, // 2 extra characters for hacker
      banner: flamebornConfig.economy.assets.vaultBanners.void_stitch,
      transferFee: 0.10 // 10% (Untraceable fee)
    },
    'eternal_aegis': {
      id: 'eternal_aegis',
      name: 'Eternal Aegis Matrix',
      description: 'A sentient defensive web with instant molecular reconstruction for stolen assets.',
      interestRate: 0.008, // 0.8% daily
      depositFee: 0.05,   // 5% fee
      withdrawFee: 0,
      insurance: 0.3,     // Recovers 30% of any stolen funds
      robResistance: 0.2, // 20% less stolen
      banner: flamebornConfig.economy.assets.vaultBanners.eternal_aegis,
      transferFee: 0.02 // 2% (Elite prioritization)
    }
  };

  static getVault(id: string): VaultType {
    return this.vaults[id] || this.vaults['prism_ledger'];
  }

  /**
   * Processes a deposit.
   */
  static async deposit(tenantId: string, userId: string, amount: number) {
    const user = await EconomyRepository.getUser(tenantId, userId);
    if (!user || Number(user.embers || 0) < amount) {
      return { success: false, message: 'You do not have enough Embers in your pocket.' };
    }

    const vault = this.getVault(user.bankType || 'prism_ledger');
    const fee = Math.floor(amount * vault.depositFee);
    const netDeposit = amount - fee;

    await EconomyRepository.updateBalance(tenantId, userId, {
      embers: -amount,
      vault: netDeposit
    });

    return { success: true, amount: netDeposit, fee, vaultName: vault.name };
  }

  /**
   * Processes a withdrawal.
   */
  static async withdraw(tenantId: string, userId: string, amount: number) {
    const user = await EconomyRepository.getUser(tenantId, userId);
    if (!user || Number(user.emberVault || 0) < amount) {
      return { success: false, message: 'You do not have enough Embers in your vault.' };
    }

    const vault = this.getVault(user.bankType || 'prism_ledger');
    const fee = Math.floor(amount * vault.withdrawFee);
    const netWithdraw = amount - fee;

    await EconomyRepository.updateBalance(tenantId, userId, {
      embers: netWithdraw,
      vault: -amount
    });

    return { success: true, amount: netWithdraw, fee, vaultName: vault.name };
  }
}
