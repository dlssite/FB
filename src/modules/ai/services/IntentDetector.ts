import { Logger } from '../../../utils/logger';

export interface DetectedIntent {
  type: 'cross_user_query' | 'channel_summary' | 'normal';
  targetUserIds?: string[];
  query?: string;
  isPrivacyRequest?: boolean;
}

export class IntentDetector {
  /**
   * Detect if the user is asking about other users' conversations
   * Patterns:
   * - "what is @user talking about"
   * - "what was [user] saying"
   * - "summarize @user's conversation"
   * - "what's happening here" (channel summary)
   * - "explain the conversation"
   */
  static detectIntent(userMessage: string, mentions: string[] = []): DetectedIntent {
    const msg = userMessage.toLowerCase().trim();

    // Pattern 1: "what is X talking/saying about" or similar
    const crossUserPatterns = [
      /what (?:is|was|are|were) @?([a-zA-Z0-9_\s-]+) (?:talking|saying|discussing|chatting) about/i,
      /what (?:is|was|are|were) @?([a-zA-Z0-9_\s-]+) (?:talking|saying|discussing|chatting)/i,
      /summarize @?([a-zA-Z0-9_\s-]+)(?:'s)? (?:conversation|chat|messages)/i,
      /tell me (?:what|about) @?([a-zA-Z0-9_\s-]+) (?:talked|said|discussed)/i,
      /what did @?([a-zA-Z0-9_\s-]+) (?:talk|say|discuss) about/i,
      /@?([a-zA-Z0-9_\s-]+) and i (?:were|was|are|been) talking about/i,
      /what .+ @?([a-zA-Z0-9_\s-]+) and .+ (?:talking|discussing|chatting) about/i
    ];

    for (const pattern of crossUserPatterns) {
      const match = msg.match(pattern);
      if (match) {
        const username = match[1]?.trim();
        if (username && username.length > 0) {
          Logger.debug(`[IntentDetector] Detected cross-user query for: ${username}`);
          return {
            type: 'cross_user_query',
            targetUserIds: [username], // Will be resolved to actual IDs later
            query: userMessage
          };
        }
      }
    }

    // Pattern 2: Direct mentions like "@user what were we talking about"
    if (mentions.length > 0) {
      const mentionPatterns = [
        /(?:what|how|tell me|explain|summarize).+(?:we|you|they).+(?:talking|discussed|said|were)/i,
        /(?:our|the|their).+(?:conversation|chat|discussion)/i,
        /what .+ (?:us|we) (?:talking|discussing|chatted)/i
      ];

      for (const pattern of mentionPatterns) {
        if (pattern.test(msg)) {
          Logger.debug(`[IntentDetector] Detected cross-user query with ${mentions.length} mentions`);
          return {
            type: 'cross_user_query',
            targetUserIds: mentions,
            query: userMessage
          };
        }
      }
    }

    // Pattern 3: "what's happening here" or channel summary patterns
    const channelSummaryPatterns = [
      /what (?:is|'s|are) happening here/i,
      /explain (?:the )?(?:conversation|chat|discussion) here/i,
      /(?:summarize|recap|tldr) (?:this|the) (?:conversation|chat|channel)/i,
      /give me (?:a )?(?:recap|summary|tldr) (?:of )?(?:this|the|here|what)/i,
      /what .+ been (?:talking|saying|discussing) about/i
    ];

    for (const pattern of channelSummaryPatterns) {
      if (pattern.test(msg)) {
        Logger.debug('[IntentDetector] Detected channel summary request');
        return {
          type: 'channel_summary',
          query: userMessage
        };
      }
    }

    // Default: normal conversation
    return {
      type: 'normal'
    };
  }

  /**
   * Resolve username mentions to user IDs using guild members
   */
  static async resolveUserIds(
    guildMembers: Map<string, any> | any[],
    userIdentifiers: string[]
  ): Promise<string[]> {
    const resolved: string[] = [];

    for (const identifier of userIdentifiers) {
      const id = identifier.toLowerCase().trim();

      // Check if it's already a Discord ID
      if (/^\d{18,}$/.test(id)) {
        resolved.push(id);
        continue;
      }

      // Search by username or display name
      let found = false;
      if (guildMembers instanceof Map) {
        for (const [userId, member] of guildMembers) {
          if (
            member?.user?.username?.toLowerCase().includes(id) ||
            member?.displayName?.toLowerCase().includes(id) ||
            member?.user?.globalName?.toLowerCase().includes(id)
          ) {
            resolved.push(userId);
            found = true;
            break;
          }
        }
      } else if (Array.isArray(guildMembers)) {
        for (const member of guildMembers) {
          if (
            member?.user?.username?.toLowerCase().includes(id) ||
            member?.displayName?.toLowerCase().includes(id) ||
            member?.user?.globalName?.toLowerCase().includes(id)
          ) {
            resolved.push(member.user.id);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        Logger.debug(`[IntentDetector] Could not resolve user identifier: ${id}`);
      }
    }

    return resolved;
  }

  /**
   * Extract Discord user mentions from a message
   * Returns array of user IDs
   */
  static extractMentions(message: any): string[] {
    if (!message?.mentions) return [];

    const mentioned: string[] = [];
    if (message.mentions.has && typeof message.mentions.has === 'function') {
      // Discord.js Message object
      message.mentions.forEach((user: any) => {
        if (user.id) mentioned.push(user.id);
      });
    } else if (message.mentions instanceof Map) {
      // Mentions as a Map
      for (const [id] of message.mentions) {
        mentioned.push(id);
      }
    }

    return mentioned;
  }

  /**
   * Check if a message is asking about privacy concerns
   */
  static isPrivacyRequest(message: string): boolean {
    const privacyPatterns = [
      /can (?:i|they|you) (?:share|see|know|tell) .+ private/i,
      /is (?:that|this|their) (?:private|personal|secret)/i,
      /(?:private|secret|personal) (?:information|details|data)/i
    ];

    return privacyPatterns.some(p => p.test(message));
  }
}
