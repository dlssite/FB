import { ModmailRepository } from '../database/ModmailRepository';

export class TriageService {
  /**
   * Evaluates a message content and returns a suggested category based on database configurations.
   */
  static async analyzeMessage(tenantId: string, guildId: string, content: string): Promise<{ category: string; suggestion?: string }> {
    const text = content.toLowerCase();

    // Fetch custom categories configured for this specific server
    const { prisma } = require('../../../database/client');
    const categories = await prisma.modmail_categories.findMany({
      where: { tenantId, guildId }
    });

    if (categories && categories.length > 0) {
      for (const cat of categories) {
        // Simple case-insensitive matching on the category name
        // Example: If a category is named "Bug Report", and the user says "bug report", it matches.
        // We split the category name into words to do basic fuzzy matching.
        const keywords = cat.name.toLowerCase().split(' ').filter((w: string) => w.length > 3);
        
        // If the category name matches exactly in the text
        if (text.includes(cat.name.toLowerCase())) {
          return { category: cat.name };
        }

        // If any significant keyword from the category name is in the text
        for (const word of keywords) {
          if (text.includes(word)) {
            return { category: cat.name };
          }
        }
      }
    }

    // Default Fallbacks if no custom categories match
    if (text.includes('billing') || text.includes('refund') || text.includes('purchase')) {
      return {
        category: 'Billing',
        suggestion: 'It looks like you need help with a purchase or billing issue. Please ensure you have your transaction ID ready for the staff.',
      };
    }

    if (text.includes('report') || text.includes('scam') || text.includes('harass')) {
      return {
        category: 'Report',
        suggestion: 'If you are reporting a user, please provide their Discord ID and any relevant screenshot evidence.',
      };
    }

    if (text.includes('ban') || text.includes('appeal') || text.includes('kicked')) {
      return {
        category: 'Appeal',
        suggestion: 'If you are appealing a moderation action, please explain what happened and why you believe the action should be reversed.',
      };
    }

    if (text.includes('bug') || text.includes('glitch') || text.includes('error')) {
      return {
        category: 'Bug Report',
        suggestion: 'Thank you for reporting a bug! Please provide the steps to reproduce the issue so our developers can investigate.',
      };
    }

    return {
      category: 'General',
    };
  }
}
