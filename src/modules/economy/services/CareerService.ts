export enum CareerPath {
  INDUSTRIALIST = 'industrialist', // Bonus to mining yield
  MERCHANT = 'merchant',           // Better market rates
  SHADOW = 'shadow',               // Bonus to "illegal" activities (rob/hack)
  SCHOLAR = 'scholar',             // Passive XP bonus
}

export class CareerService {
  /**
   * Calculates the XP required for a specific level.
   */
  static getRequiredXp(level: number): number {
    return Math.floor(1000 * Math.pow(level, 1.5));
  }

  /**
   * Processes XP gain and handles level-ups.
   */
  static async addXp(currentXp: number, currentLevel: number, amount: number) {
    const newXp = currentXp + amount;
    const required = this.getRequiredXp(currentLevel);

    if (newXp >= required) {
      return {
        leveledUp: true,
        newLevel: currentLevel + 1,
        remainingXp: newXp - required,
      };
    }

    return {
      leveledUp: false,
      newLevel: currentLevel,
      remainingXp: newXp,
    };
  }

  /**
   * Returns career-specific bonuses.
   */
  static getBonuses(path: CareerPath, level: number) {
    const scale = level * 0.02; // 2% bonus per level
    return {
      mining: path === CareerPath.INDUSTRIALIST ? 0.2 + scale : scale,
      trading: path === CareerPath.MERCHANT ? 0.15 + scale : scale,
      stealing: path === CareerPath.SHADOW ? 0.25 + scale : scale,
      learning: path === CareerPath.SCHOLAR ? 0.3 + scale : scale,
    };
  }
}
