import { Message } from 'discord.js';
import { AutomodRepository } from '../database/AutomodRepository';

export class AutomodExemptionService {
  /**
   * Check if a message should be exempt from automod
   */
  static async isExempt(message: Message, tenantId: string): Promise<boolean> {
    if (!message.guild) return false;

    const settings = await AutomodRepository.getSettings(tenantId, message.guild.id);
    if (!settings) return false;

    // Check user exemption
    if (await this.isUserExempt(message.author.id, message.guild.id, tenantId)) {
      return true;
    }

    // Check channel exemption
    if (await this.isChannelExempt(message.channel.id, message.guild.id, tenantId)) {
      return true;
    }

    // Check category exemption
    if ('parentId' in message.channel && message.channel.parentId) {
      if (await this.isCategoryExempt(message.channel.parentId, message.guild.id, tenantId)) {
        return true;
      }
    }

    // Check role exemption
    if (message.member?.roles.cache) {
      for (const roleId of message.member.roles.cache.keys()) {
        if (await this.isRoleExempt(roleId, message.guild.id, tenantId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a specific user is exempt
   */
  static async isUserExempt(userId: string, guildId: string, tenantId: string): Promise<boolean> {
    return await AutomodRepository.isExempt(guildId, tenantId, 'user', userId);
  }

  /**
   * Check if a specific role is exempt
   */
  static async isRoleExempt(roleId: string, guildId: string, tenantId: string): Promise<boolean> {
    return await AutomodRepository.isExempt(guildId, tenantId, 'role', roleId);
  }

  /**
   * Check if a specific channel is exempt
   */
  static async isChannelExempt(channelId: string, guildId: string, tenantId: string): Promise<boolean> {
    return await AutomodRepository.isExempt(guildId, tenantId, 'channel', channelId);
  }

  /**
   * Check if a specific category is exempt
   */
  static async isCategoryExempt(categoryId: string, guildId: string, tenantId: string): Promise<boolean> {
    return await AutomodRepository.isExempt(guildId, tenantId, 'category', categoryId);
  }

  /**
   * Add exemption
   */
  static async addExemption(
    guildId: string,
    tenantId: string,
    type: 'user' | 'role' | 'channel' | 'category',
    targetId: string,
    reason?: string
  ): Promise<void> {
    await AutomodRepository.addExemption(guildId, tenantId, type, targetId, reason);
  }

  /**
   * Remove exemption
   */
  static async removeExemption(
    guildId: string,
    tenantId: string,
    type: 'user' | 'role' | 'channel' | 'category',
    targetId: string
  ): Promise<void> {
    await AutomodRepository.removeExemption(guildId, tenantId, type, targetId);
  }

  /**
   * List all exemptions of a type
   */
  static async listExemptions(
    guildId: string,
    tenantId: string,
    type?: 'user' | 'role' | 'channel' | 'category'
  ): Promise<Array<{ type: string; targetId: string; reason?: string }>> {
    return await AutomodRepository.listExemptions(guildId, tenantId, type);
  }

  /**
   * Clear all exemptions of a type
   */
  static async clearExemptions(
    guildId: string,
    tenantId: string,
    type?: 'user' | 'role' | 'channel' | 'category'
  ): Promise<number> {
    return await AutomodRepository.clearExemptions(guildId, tenantId, type);
  }
}
