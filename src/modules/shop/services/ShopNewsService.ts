import { TextChannel, EmbedBuilder } from 'discord.js';
import { flamebornConfig } from '../../../config/flameborn.config';
import { prisma } from '../../../database/client';
import { Logger } from '../../../utils/logger';

export class ShopNewsService {
  /**
   * Broadcasts a news message to the configured shop news channel.
   */
  static async broadcast(client: any, tenantId: string, guildId: string, title: string, description: string, color: string = '#7367F0', image?: string) {
    const globalConfig = flamebornConfig.shop.news;
    if (!globalConfig.enabled) return;

    try {
      // 1. Check DB settings (tenant + guild)
      let settings = await prisma.shop_settings.findUnique({
        where: { guildId_tenantId: { guildId, tenantId } }
      });

      // Fallback: Check by guildId only
      if (!settings) {
        settings = await prisma.shop_settings.findFirst({ where: { guildId } });
      }

      const channelId = settings?.newsChannelId || globalConfig.channelId;
      if (!channelId) return;

      const channel = await client.channels.fetch(channelId) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Marketplace Terminal', iconURL: 'https://cdn-icons-png.flaticon.com/512/2652/2652218.png' })
        .setTitle(title)
        .setDescription(description)
        .setColor(color as any)
        .setTimestamp();

      if (image) embed.setImage(image);
      else if (flamebornConfig.shop.assets.marketBanner) embed.setImage(flamebornConfig.shop.assets.marketBanner);

      await channel.send({ embeds: [embed] });
      Logger.info(`Broadcasted news: ${title}`, 'SHOP' as any);
    } catch (err) {
      console.error('[ShopNewsService] Failed to broadcast news:', err);
    }
  }

  /**
   * Special themed broadcast for new item templates.
   */
  static async broadcastNewArrival(client: any, tenantId: string, guildId: string, item: any) {
    const config = flamebornConfig.shop;
    const categoryEmoji = (config.emojis as any)[item.category.identifier] || config.emojis.default;

    return this.broadcast(
      client,
      tenantId,
      guildId,
      `📦 NEW ARRIVAL: ${item.name}`,
      `A new blueprint has been salvaged from the wastes and added to **${item.category.name}**.\n\n**Price:** ${item.basePrice} Embers\n**Description:** ${item.description || 'No data found.'}`,
      '#28C76F'
    );
  }

  /**
   * Special themed broadcast for legendary purchases.
   */
  static async broadcastLegendarySale(client: any, tenantId: string, guildId: string, userName: string, itemName: string) {
    return this.broadcast(
      client,
      tenantId,
      guildId,
      `👑 LEGENDARY ACQUISITION`,
      `The wastes tremble. **${userName}** has successfully purchased a **LEGENDARY ${itemName}**!\n\nThis asset is now part of their private collection.`,
      '#FF9F43'
    );
  }

  /**
   * Generates a summary of the last 24 hours of marketplace activity.
   */
  static async getDailySummary(tenantId: string, guildId: string) {
    const count = await prisma.economy_transactions.count({
      where: { 
        tenantId, 
        category: 'SHOP_PURCHASE', 
        createdAt: { gte: new Date(Date.now() - 86400000) } 
      }
    });

    const recent = await prisma.economy_transactions.findMany({
      where: { tenantId, category: 'SHOP_PURCHASE' },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    let text = `**Total Transactions (24h):** ${count}\n\n`;
    if (recent.length > 0) {
      text += `**Recent Activity:**\n` + recent.map(r => `• ${r.reason}`).join('\n');
    } else {
      text += `*No recent transactions recorded.*`;
    }

    return text;
  }
}
