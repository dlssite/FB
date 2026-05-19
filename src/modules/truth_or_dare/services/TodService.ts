import { QUESTIONS, TodType, TodTier, TodQuestion } from '../data/questions';
import { RedisService } from '../../../services/RedisService';
import { TodRepository } from '../database/TodRepository';

export class TodService {
  /**
   * Fetches a random question based on type and max tier allowed.
   */
  static async fetchQuestion(type: TodType, maxTier: TodTier, sessionId: string): Promise<TodQuestion | null> {
    const tiers: TodTier[] = ['SOFT'];
    if (maxTier === 'PARTY' || maxTier === 'SPICY') tiers.push('PARTY');
    if (maxTier === 'SPICY') tiers.push('SPICY');

    const filtered = QUESTIONS.filter(q => q.type === type && tiers.includes(q.tier));
    if (filtered.length === 0) return null;

    // Avoid repeats in the current session
    const cacheKey = `tod:shown:${sessionId}`;
    const shownIds = await RedisService.get(cacheKey).then(d => d ? JSON.parse(d) : []);
    
    const pool = filtered.filter(q => !shownIds.includes(q.id));
    const finalPool = pool.length > 0 ? pool : filtered; // Reset pool if all shown

    const question = finalPool[Math.floor(Math.random() * finalPool.length)];
    
    // Update shown cache
    shownIds.push(question.id);
    await RedisService.set(cacheKey, JSON.stringify(shownIds.slice(-20)), 3600); // Keep last 20

    return question;
  }

  /**
   * Starts a new multiplayer session in Redis.
   */
  static async startSession(guildId: string, hostId: string, players: string[]) {
    const sessionKey = `tod:game:${guildId}`;
    const session = {
      hostId,
      players,
      state: 'LOBBY',
      proposals: [],
      playedThisRound: [],
      victimId: null,
      currentQuestion: null,
      createdAt: Date.now()
    };
    await RedisService.set(sessionKey, JSON.stringify(session), 7200); // 2 hour session
    return session;
  }

  /**
   * Gets an active session.
   */
  static async getSession(guildId: string) {
    const data = await RedisService.get(`tod:game:${guildId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Updates session state in Redis.
   */
  static async updateSession(guildId: string, data: any) {
    const session = await this.getSession(guildId);
    if (!session) return null;

    const updated = { ...session, ...data };
    await RedisService.set(`tod:game:${guildId}`, JSON.stringify(updated), 7200);
    return updated;
  }

  /**
   * Adds a proposal from the audience.
   */
  static async addProposal(guildId: string, userId: string, text: string) {
    const session = await this.getSession(guildId);
    if (!session) return null;

    session.proposals.push({ userId, text, id: Math.random().toString(36).substr(2, 9) });
    await RedisService.set(`tod:game:${guildId}`, JSON.stringify(session), 7200);
    return session;
  }

  /**
   * Awards points to a player.
   */
  static async awardBravePoints(userId: string, tenantId: string, type: 'TRUTH' | 'DARE' | 'CHICKEN') {
    const points = type === 'DARE' ? 15 : (type === 'TRUTH' ? 10 : 0);
    const field = type === 'DARE' ? 'daresCompleted' : (type === 'TRUTH' ? 'truthsAnswered' : 'chickens');
    return await TodRepository.incrementStats(userId, tenantId, field, points);
  }

  /**
   * Ends an active session.
   */
  static async endSession(guildId: string) {
    return await RedisService.del(`tod:game:${guildId}`);
  }
}
