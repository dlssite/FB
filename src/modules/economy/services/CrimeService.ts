import { EconomyRepository } from '../database/EconomyRepository';
import { CareerPath, CareerService } from './CareerService';
import { VaultService } from './VaultService';
import { Translator } from '../../../core/Translator';
import { tenantStorage } from '../../../utils/context';

export interface CrimeResult {
  success: boolean;
  amount: number;
  scenario: string;
  isOpportunity?: boolean;
  sequence?: string[];
}

export class CrimeService {
  /**
   * Processes a robbery attempt.
   */
  static async rob(tenantId: string, userId: string, targetId: string): Promise<CrimeResult> {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const [actor, victim] = await Promise.all([
      EconomyRepository.getUser(tenantId, userId),
      EconomyRepository.getUser(tenantId, targetId)
    ]);

    if (!victim || Number(victim.embers || 0) < 500) {
      return { success: false, amount: 0, scenario: Translator.t('economy', 'crime.target_too_poor', lang, { min: 500 }) };
    }

    // Shadow path gives a massive success bonus
    const path = (actor?.careerMastered === 3 ? CareerPath.SHADOW : CareerPath.INDUSTRIALIST) as CareerPath;
    const bonuses = CareerService.getBonuses(path, actor?.careerMastered || 1);
    
    const winRate = 0.45 + (path === CareerPath.SHADOW ? 0.2 : 0);
    const isSuccess = Math.random() < winRate;
    const isOpportunity = Math.random() < 0.25; 

    // Localized Scenarios
    const scenarios = Translator.t('economy', 'crime.rob_scenarios', lang) as unknown as string[];
    const scenarioTemplate = scenarios[Math.floor(Math.random() * scenarios.length)];
    const scenario = scenarioTemplate.replace('{{user}}', `<@${targetId}>`);

    if (!isSuccess) {
      const penalty = Math.floor(Number(actor?.embers || 0) * 0.1); // Lose 10% on fail
      await EconomyRepository.updateBalance(tenantId, userId, { embers: -penalty });
      return { success: false, amount: penalty, scenario: Translator.t('economy', 'crime.caught', lang, { penalty: penalty.toLocaleString() }) };
    }

    // Apply Robbery Resistance
    const vault = VaultService.getVault(victim.bankType || 'prism_ledger');
    let stealPercent = 0.05 + (Math.random() * 0.1); // Steal 5-15%
    
    if (vault.robResistance) {
      stealPercent *= (1 - vault.robResistance);
    }

    let amount = Math.floor(Number(victim.embers) * stealPercent);

    // Apply Insurance
    let insuranceMessage = "";
    if (vault.insurance) {
      const recovered = Math.floor(amount * vault.insurance);
      await EconomyRepository.updateBalance(tenantId, targetId, { embers: recovered });
      insuranceMessage = Translator.t('economy', 'crime.insurance', lang, { user: `<@${targetId}>`, recovered: recovered.toLocaleString() });
    }

    return { 
      success: true, 
      amount, 
      scenario: scenario + insuranceMessage, 
      isOpportunity 
    };
  }

  /**
   * Prepares a hacking attempt with a sequence challenge.
   */
  static async prepareHack(tenantId: string, targetId: string): Promise<CrimeResult> {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const victim = await EconomyRepository.getUser(tenantId, targetId);

    if (!victim || Number(victim.embers || 0) < 1000) {
      return { success: false, amount: 0, scenario: Translator.t('economy', 'crime.target_too_poor', lang, { min: 1000 }) };
    }

    const scenarios = Translator.t('economy', 'crime.hack_scenarios', lang) as unknown as string[];
    const scenarioTemplate = scenarios[Math.floor(Math.random() * scenarios.length)];
    const scenario = scenarioTemplate.replace('{{user}}', `<@${targetId}>`);

    const vault = VaultService.getVault(victim.bankType || 'prism_ledger');
    const baseLength = 4;
    const finalLength = baseLength + (vault.hackDifficulty || 0);

    const chars = ['A', 'B', 'C', 'D', 'E', 'F'];
    const sequence = Array.from({ length: finalLength }, () => chars[Math.floor(Math.random() * chars.length)]);
    
    const amount = Math.floor(Math.random() * 800) + 500; 
    return { success: true, amount, scenario, sequence };
  }

  /**
   * Finalizes a hacking attempt after success.
   */
  static async finalizeHack(tenantId: string, userId: string, amount: number) {
    return await EconomyRepository.updateBalance(tenantId, userId, { embers: amount });
  }

  /**
   * Punishes a failed hacking attempt.
   */
  static async punishHack(tenantId: string, userId: string) {
    const penalty = 500;
    return await EconomyRepository.updateBalance(tenantId, userId, { embers: -penalty });
  }

  /**
   * Special Easter Egg: Robbing the Bot (Flameborn)
   */
  static async robBot(tenantId: string, userId: string): Promise<CrimeResult> {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const actor = await EconomyRepository.getUser(tenantId, userId);
    
    const scenarios = Translator.t('economy', 'crime.bot_responses', lang) as unknown as string[];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    const isSuccess = Math.random() < 0.05; // 5% win rate
    if (!isSuccess) {
      const penalty = Math.floor(Number(actor?.embers || 0) * 0.5); // Lose 50% on fail
      await EconomyRepository.updateBalance(tenantId, userId, { embers: -penalty });
      return { 
        success: false, 
        amount: penalty, 
        scenario: scenario + Translator.t('economy', 'crime.bot_defense', lang, { penalty: penalty.toLocaleString() }) 
      };
    }

    const reward = 50000; // Flat massive reward
    return { 
      success: true, 
      amount: reward, 
      scenario: scenario + Translator.t('economy', 'crime.bot_override', lang, { reward: reward.toLocaleString() }) 
    };
  }

  /**
   * Special Easter Egg: Hacking the Bot (Flameborn)
   */
  static async prepareHackBot(tenantId: string): Promise<CrimeResult> {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const scenario = lang === 'fr' 
      ? "Vous tentez de synchroniser votre conscience avec le Noyau de Flameborn. C'est comme essayer de boire l'océan avec une paille. Je sens vos battements de cœur dans mes flux de données."
      : "You are attempting to synchronize your consciousness with the Flameborn Core. It's like trying to drink the ocean through a straw. I can feel your heartbeat in my data-streams.";
    
    const chars = ['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Z'];
    const sequence = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]);
    
    return { success: true, amount: 250000, scenario, sequence };
  }
}
