import { Logger } from '../../../utils/logger';

export enum KeyStatus {
  ACTIVE = 'ACTIVE',
  RATE_LIMITED = 'RATE_LIMITED',
  DEAD = 'DEAD' // e.g. 401 Unauthorized, quota exceeded
}

export type ProviderType = 'openrouter';

export interface ApiKeyData {
  key: string;
  provider: ProviderType;
  status: KeyStatus;
  cooldownUntil?: number;
  stats: {
    requests: number;
    success: number;
    fails: number;
  };
}

export class ApiKeyManager {
  private static keys: ApiKeyData[] = [];
  private static rrIndexes: Record<ProviderType, number> = {
    openrouter: 0
  };

  static initialize() {
    this.keys = [];
    this.loadKeysFromEnv('OPENROUTER_API_KEYS', 'openrouter');
    Logger.info(`[ApiKeyManager] Loaded ${this.keys.length} OpenRouter API keys.`);
  }

  private static isValidKey(key: string, provider: ProviderType): boolean {
    if (provider === 'openrouter') return key.startsWith('sk-or-v1-') && key.length > 20;
    return key.length > 20;
  }

  private static loadKeysFromEnv(envVar: string, provider: ProviderType) {
    const raw = process.env[envVar];
    if (!raw) return;

    const splitKeys = raw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    for (const key of splitKeys) {
      if (!this.isValidKey(key, provider)) {
        Logger.warn(`[ApiKeyManager] Skipping invalid/placeholder key for ${provider}: "${key.substring(0, 8)}..."`);
        continue;
      }
      this.keys.push({
        key,
        provider,
        status: KeyStatus.ACTIVE,
        stats: { requests: 0, success: 0, fails: 0 }
      });
    }
  }

  static hasActiveKeys(provider: ProviderType): boolean {
    this.processCooldowns();
    return this.keys.some(k => k.provider === provider && k.status === KeyStatus.ACTIVE);
  }

  static getKey(provider: ProviderType): ApiKeyData | null {
    // Before selecting, check if any rate-limited keys are ready to be active again
    this.processCooldowns();

    const providerKeys = this.keys.filter(k => k.provider === provider && k.status === KeyStatus.ACTIVE);
    if (providerKeys.length === 0) return null;

    // Round robin selection
    const index = this.rrIndexes[provider] % providerKeys.length;
    const selectedKey = providerKeys[index];
    this.rrIndexes[provider]++;
    
    return selectedKey;
  }

  static reportSuccess(keyString: string) {
    const keyData = this.keys.find(k => k.key === keyString);
    if (keyData) {
      keyData.stats.requests++;
      keyData.stats.success++;
    }
  }

  static reportError(keyString: string, statusCode: number) {
    const keyData = this.keys.find(k => k.key === keyString);
    if (!keyData) return;

    keyData.stats.requests++;
    keyData.stats.fails++;

    if (statusCode === 429) {
      keyData.status = KeyStatus.RATE_LIMITED;
      keyData.cooldownUntil = Date.now() + 60000; // 60 seconds cooldown
      Logger.warn(`[ApiKeyManager] Key for ${keyData.provider} hit rate limit. Sidelined for 60s.`);
    } else if (statusCode === 401 || statusCode === 403) {
      keyData.status = KeyStatus.DEAD;
      Logger.error(`[ApiKeyManager] Key for ${keyData.provider} is DEAD (Auth Error: ${statusCode}).`);
    } else {
      // 500s or timeouts don't necessarily kill the key, but we track the fail
    }
  }

  private static processCooldowns() {
    const now = Date.now();
    for (const keyData of this.keys) {
      if (keyData.status === KeyStatus.RATE_LIMITED && keyData.cooldownUntil && now > keyData.cooldownUntil) {
        keyData.status = KeyStatus.ACTIVE;
        keyData.cooldownUntil = undefined;
        Logger.info(`[ApiKeyManager] Key for ${keyData.provider} has recovered from rate limit.`);
      }
    }
  }

  static getStats() {
    this.processCooldowns(); // ensure accurate stats
    
    const stats: Record<ProviderType, { active: number, limited: number, dead: number, totalRequests: number, totalFails: number }> = {
      openrouter: { active: 0, limited: 0, dead: 0, totalRequests: 0, totalFails: 0 }
    };

    for (const k of this.keys) {
      const s = stats[k.provider];
      if (k.status === KeyStatus.ACTIVE) s.active++;
      if (k.status === KeyStatus.RATE_LIMITED) s.limited++;
      if (k.status === KeyStatus.DEAD) s.dead++;
      
      s.totalRequests += k.stats.requests;
      s.totalFails += k.stats.fails;
    }

    return stats;
  }
}

// Initialize immediately
ApiKeyManager.initialize();
