import { EconomyRepository } from '../database/EconomyRepository';

export type TransactionType = 'INCOME' | 'LOSS' | 'TRANSFER' | 'ADMIN';

export class LedgerService {
  /**
   * Logs a financial transaction for a user.
   */
  static async log(data: {
    tenantId: string;
    userId: string;
    type: TransactionType;
    category: string;
    amount: number | bigint;
    reason?: string;
    metadata?: any;
  }) {
    // Fetch current user state to calculate balance after transaction
    // Note: In a high-concurrency env, we might want to pass the balance from the update step
    // but here we fetch the latest state for accuracy in the ledger view.
    const user = await EconomyRepository.getUser(data.tenantId, data.userId);
    const currentBalance = Number(user?.embers || 0) + Number(user?.emberVault || 0);

    return await EconomyRepository.addTransaction({
      ...data,
      balance: currentBalance
    });
  }

  /**
   * Formats transaction amount with +/- and emoji.
   */
  static formatAmount(amount: bigint | number, type: TransactionType): string {
    const val = typeof amount === 'bigint' ? Number(amount) : amount;
    const sign = val >= 0 ? '+' : '';
    return `\`${sign}${val.toLocaleString()} 💠\``;
  }
}
