import { Logger } from '../../../utils/logger';
import { ChatMessage } from '../types/AiManifest';
import { MemoryService } from './MemoryService';
import { OpenRouter } from '@openrouter/sdk';
import { ApiKeyManager } from './ApiKeyManager';
import { flamebornConfig } from '../../../config/flameborn.config';

export interface ConversationSummary {
  userId: string;
  username: string;
  messageCount: number;
  topics: string[];
  summary: string;
  lastUpdated: number;
}

export class ConversationSummarizer {
  /**
   * Generate a summary of a user's conversation in a channel
   */
  static async summarizeUserConversation(
    channelId: string,
    userId: string,
    username: string,
    messages: ChatMessage[]
  ): Promise<ConversationSummary | null> {
    if (messages.length === 0) {
      return {
        userId,
        username,
        messageCount: 0,
        topics: [],
        summary: 'No conversation history.',
        lastUpdated: Date.now()
      };
    }

    try {
      // Extract only user messages (role: 'user')
      const userMessages = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n');

      if (!userMessages.trim()) {
        return {
          userId,
          username,
          messageCount: messages.length,
          topics: [],
          summary: 'No user messages found.',
          lastUpdated: Date.now()
        };
      }

      // Use OpenRouter to generate summary
      const apiKey = ApiKeyManager.getCurrentApiKey();
      if (!apiKey) {
        Logger.warn('[ConversationSummarizer] No API key available');
        return null;
      }

      const client = new OpenRouter({ apiKey });

      const summaryPrompt = `You are a conversation analyzer. Summarize the following user's messages in a channel concisely (2-3 sentences max). Extract 2-3 main topics they discussed.

User's messages:
${userMessages}

Respond in this exact format:
TOPICS: [topic1, topic2, topic3]
SUMMARY: [2-3 sentence summary]`;

      const response = await client.chat.completions.create({
        model: flamebornConfig.ai.models.default,
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 200
      });

      const responseText = response.choices[0]?.message?.content || '';

      // Parse response
      const topicsMatch = responseText.match(/TOPICS:\s*\[([^\]]+)\]/);
      const summaryMatch = responseText.match(/SUMMARY:\s*(.+?)(?=$|TOPICS)/s);

      const topics = topicsMatch
        ? topicsMatch[1]
            .split(',')
            .map(t => t.trim().replace(/^["']|["']$/g, ''))
            .filter(t => t.length > 0)
        : [];

      const summary = summaryMatch ? summaryMatch[1].trim() : userMessages.substring(0, 150);

      const result: ConversationSummary = {
        userId,
        username,
        messageCount: messages.length,
        topics,
        summary,
        lastUpdated: Date.now()
      };

      // Cache the summary
      await MemoryService.cacheConversationSummary(
        channelId,
        userId,
        JSON.stringify(result),
        1800 // 30 minutes TTL
      );

      Logger.debug(`[ConversationSummarizer] Generated summary for user ${userId}: ${topics.length} topics, ${summary.length} chars`);
      return result;
    } catch (err) {
      Logger.error(`[ConversationSummarizer] Error summarizing conversation: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Get or generate summary for a user
   */
  static async getOrGenerateSummary(
    channelId: string,
    userId: string,
    username: string,
    messages: ChatMessage[]
  ): Promise<ConversationSummary | null> {
    // Check cache first
    const cached = await MemoryService.getCachedSummary(channelId, userId);
    if (cached) {
      try {
        return JSON.parse(cached) as ConversationSummary;
      } catch (err) {
        Logger.warn('[ConversationSummarizer] Failed to parse cached summary');
      }
    }

    // Generate fresh summary
    return this.summarizeUserConversation(channelId, userId, username, messages);
  }

  /**
   * Generate summaries for all users in a channel
   */
  static async summarizeAllUsers(channelId: string): Promise<ConversationSummary[]> {
    const allHistories = await MemoryService.getAllUserHistories(channelId);
    const summaries: ConversationSummary[] = [];

    for (const [userId, messages] of allHistories) {
      const metadata = await MemoryService.getUserMetadata(channelId, userId);
      const username = metadata?.username || `User${userId.substring(0, 4)}`;

      const summary = await this.getOrGenerateSummary(channelId, userId, username, messages);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  /**
   * Find relevant users/summaries for a query
   * Returns summaries of users who discussed topics related to the query
   */
  static async findRelevantSummaries(
    channelId: string,
    query: string,
    targetUserId?: string
  ): Promise<ConversationSummary[]> {
    const allHistories = await MemoryService.getAllUserHistories(channelId);
    const relevant: ConversationSummary[] = [];

    for (const [userId, messages] of allHistories) {
      // Skip if looking for specific user and this isn't them
      if (targetUserId && userId !== targetUserId) continue;
      // Skip the querying user themselves
      if (!targetUserId && userId === targetUserId) continue;

      const metadata = await MemoryService.getUserMetadata(channelId, userId);
      const username = metadata?.username || `User${userId.substring(0, 4)}`;

      const summary = await this.getOrGenerateSummary(channelId, userId, username, messages);
      if (summary && summary.summary.length > 0) {
        // Simple relevance check: does summary mention keywords from query?
        const queryLower = query.toLowerCase();
        const isRelevant =
          summary.topics.some(t => queryLower.includes(t.toLowerCase())) ||
          summary.summary.toLowerCase().includes(queryLower);

        if (isRelevant || targetUserId === userId) {
          relevant.push(summary);
        }
      }
    }

    return relevant;
  }
}
