import { PrismaClient } from '@prisma/client';
import { RedisService } from '../../../services/RedisService';
import { Logger } from '../../../utils/logger';
import { Canvas, Path2D } from 'skia-canvas';
import { AttachmentBuilder, Client, Guild } from 'discord.js';
import { RoutingService } from '../../../services/RoutingService';
import { ActivityLogService } from './ActivityLogService';

const prisma = new PrismaClient();

export interface ChannelStatsInput {
  channelId: string;
  count: number;
}

export class ActivityService {
  /**
   * Log chat message details securely to Redis buffer.
   */
  static async logMessageActivity(
    tenantId: string,
    guildId: string,
    userId: string,
    channelId: string,
    metrics: { media: number; emojis: number; links: number }
  ) {
    const today = new Date().toISOString().substring(0, 10);
    const userKey = `activity:user:${tenantId}:${guildId}:${userId}:${today}`;
    const channelKey = `activity:channel:${tenantId}:${guildId}:${userId}:${channelId}:${today}`;

    // Buffer user aggregate metrics
    await RedisService.client.hincrby(userKey, 'messages', 1);
    if (metrics.media > 0) await RedisService.client.hincrby(userKey, 'media', metrics.media);
    if (metrics.emojis > 0) await RedisService.client.hincrby(userKey, 'emojis', metrics.emojis);
    if (metrics.links > 0) await RedisService.client.hincrby(userKey, 'links', metrics.links);

    // Buffer channel aggregate metric
    await RedisService.client.hincrby(channelKey, 'messages', 1);
  }

  /**
   * Log prefix/slash command executions securely to Redis buffer.
   */
  static async logCommandActivity(tenantId: string, guildId: string, userId: string) {
    const today = new Date().toISOString().substring(0, 10);
    const userKey = `activity:user:${tenantId}:${guildId}:${userId}:${today}`;
    await RedisService.client.hincrby(userKey, 'commands', 1);
  }

  /**
   * Log reaction actions securely to Redis buffer.
   */
  static async logReactionActivity(tenantId: string, guildId: string, userId: string) {
    const today = new Date().toISOString().substring(0, 10);
    const userKey = `activity:user:${tenantId}:${guildId}:${userId}:${today}`;
    await RedisService.client.hincrby(userKey, 'reactions', 1);
  }

  /**
   * Log server joins/leaves growth metrics securely to Redis buffer.
   */
  static async logServerGrowth(tenantId: string, guildId: string, type: 'join' | 'leave') {
    const today = new Date().toISOString().substring(0, 10);
    const growthKey = `activity:server:${tenantId}:${guildId}:${today}`;
    await RedisService.client.hincrby(growthKey, type === 'join' ? 'joins' : 'leaves', 1);
  }

  /**
   * Logs voice time durations in seconds.
   */
  static async logVoiceActivity(tenantId: string, guildId: string, userId: string, durationSeconds: number) {
    const today = new Date().toISOString().substring(0, 10);
    const userKey = `activity:user:${tenantId}:${guildId}:${userId}:${today}`;
    await RedisService.client.hincrby(userKey, 'voiceTime', durationSeconds);
  }

  static async getUsersActiveSince(tenantId: string, guildId: string, cutoffDate: Date) {
    const activeUserIds = new Set<string>();

    const dbLogs = await prisma.activity_logs.findMany({
      where: {
        tenantId,
        guildId,
        date: { gte: cutoffDate },
        messages: { gt: 0 }
      },
      select: { userId: true }
    });

    dbLogs.forEach(log => activeUserIds.add(log.userId));

    const pattern = `activity:user:${tenantId}:${guildId}:*:*`;
    const keys = await RedisService.client.keys(pattern);
    for (const key of keys) {
      const parts = key.split(':'); // ['activity', 'user', tenantId, guildId, userId, date]
      const userId = parts[4];
      const dateStr = parts[5];
      if (!dateStr) continue;
      const date = new Date(dateStr);
      if (date >= cutoffDate) {
        const data = await RedisService.client.hgetall(key);
        if (data && parseInt(data.messages || '0', 10) > 0) {
          activeUserIds.add(userId);
        }
      }
    }

    return activeUserIds;
  }

  static async getInactiveMembers(guild: Guild, tenantId: string, days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const activeUserIds = await this.getUsersActiveSince(tenantId, guild.id, cutoff);
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const inactiveMemberIds: string[] = [];

    for (const member of members.values()) {
      if (member.user.bot) continue;
      if (member.joinedAt && member.joinedAt > cutoff) continue;
      if (!activeUserIds.has(member.id)) {
        inactiveMemberIds.push(member.id);
      }
    }

    return inactiveMemberIds;
  }

  static async applyInactiveRoles(client: Client) {
    for (const guild of client.guilds.cache.values()) {
      try {
        const tenantId = await RoutingService.resolveTenantId(guild.id, 'activity');
        const settings = await ActivityLogService.getSettings(tenantId, guild.id);
        const roleId = settings.inactivityRoleId;
        const days = settings.inactivityDays;

        if (!roleId || !days || days < 1) continue;

        const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
        if (!role) continue;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const activeUserIds = await this.getUsersActiveSince(tenantId, guild.id, cutoff);

        const members = await guild.members.fetch().catch(() => guild.members.cache);
        for (const member of members.values()) {
          if (member.user.bot) continue;
          if (member.joinedAt && member.joinedAt > cutoff) continue;

          const isActive = activeUserIds.has(member.id);
          const hasInactiveRole = member.roles.cache.has(roleId);

          if (isActive && hasInactiveRole) {
            await member.roles.remove(roleId, 'Member became active again').catch(() => null);
          }

          if (!isActive && !hasInactiveRole && member.joinedAt && member.joinedAt <= cutoff) {
            await member.roles.add(roleId, 'Member marked inactive by activity tracker').catch(() => null);
          }
        }
      } catch (error) {
        Logger.error('[ACTIVITY] Error applying inactive roles', error);
      }
    }
  }

  /**
   * Retrieves aggregated user stats combining PostgreSQL historical logs and real-time Redis memory buffer.
   */
  static async getLiveUserStats(tenantId: string, guildId: string, userId: string) {
    let stats = await prisma.activity_stats.findUnique({
      where: {
        guildId_userId_tenantId: { guildId, userId, tenantId }
      }
    });

    if (!stats) {
      stats = {
        id: 0, guildId, tenantId, userId,
        totalMessages: BigInt(0), totalVoiceTime: BigInt(0), totalMedia: BigInt(0),
        totalEmojis: BigInt(0), totalReactions: BigInt(0), totalLinks: BigInt(0),
        totalCommands: BigInt(0), createdAt: new Date(), updatedAt: new Date()
      };
    }

    const today = new Date().toISOString().substring(0, 10);
    const userKey = `activity:user:${tenantId}:${guildId}:${userId}:${today}`;
    const liveData = await RedisService.client.hgetall(userKey);

    if (liveData && Object.keys(liveData).length > 0) {
      stats.totalMessages += BigInt(parseInt(liveData.messages || '0', 10));
      stats.totalVoiceTime += BigInt(parseInt(liveData.voiceTime || '0', 10));
      stats.totalMedia += BigInt(parseInt(liveData.media || '0', 10));
      stats.totalEmojis += BigInt(parseInt(liveData.emojis || '0', 10));
      stats.totalReactions += BigInt(parseInt(liveData.reactions || '0', 10));
      stats.totalLinks += BigInt(parseInt(liveData.links || '0', 10));
      stats.totalCommands += BigInt(parseInt(liveData.commands || '0', 10));
    }

    return stats;
  }

  /**
   * Retrieves aggregated user channel stats combining PostgreSQL historical logs and real-time Redis memory buffer.
   */
  static async getLiveUserChannelStats(tenantId: string, guildId: string, userId: string) {
    const channelGroup = await prisma.user_channel_logs.groupBy({
      by: ['channelId'],
      where: { guildId, userId, tenantId },
      _sum: { messages: true },
      orderBy: { _sum: { messages: 'desc' } }
    });

    const channelMap = new Map<string, number>();
    channelGroup.forEach(c => {
      channelMap.set(c.channelId, Number(c._sum.messages || 0));
    });

    // Fetch live channels from Redis
    const today = new Date().toISOString().substring(0, 10);
    const pattern = `activity:channel:${tenantId}:${guildId}:${userId}:*:${today}`;
    const keys = await RedisService.client.keys(pattern);

    for (const key of keys) {
      const parts = key.split(':'); // ['activity', 'channel', tenantId, guildId, userId, channelId, date]
      const channelId = parts[5];
      const data = await RedisService.client.hgetall(key);
      if (data && data.messages) {
        const count = parseInt(data.messages, 10);
        channelMap.set(channelId, (channelMap.get(channelId) || 0) + count);
      }
    }

    return Array.from(channelMap.entries())
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Retrieves server growth data combining PostgreSQL historical logs and real-time Redis memory buffer.
   */
  static async getLiveServerGrowth(tenantId: string, guildId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dbLogs = await prisma.server_activity_logs.findMany({
      where: { guildId, tenantId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' }
    });

    const dateMap = new Map<string, { joins: number; leaves: number }>();
    dbLogs.forEach(l => {
      const dateStr = l.date.toISOString().substring(0, 10);
      dateMap.set(dateStr, { joins: Number(l.joins), leaves: Number(l.leaves) });
    });

    // Add current live server stats from Redis
    const today = new Date().toISOString().substring(0, 10);
    const growthKey = `activity:server:${tenantId}:${guildId}:${today}`;
    const liveData = await RedisService.client.hgetall(growthKey);

    if (liveData && Object.keys(liveData).length > 0) {
      const joins = parseInt(liveData.joins || '0', 10);
      const leaves = parseInt(liveData.leaves || '0', 10);

      const existing = dateMap.get(today) || { joins: 0, leaves: 0 };
      dateMap.set(today, {
        joins: existing.joins + joins,
        leaves: existing.leaves + leaves
      });
    }

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      const stats = dateMap.get(dateStr) || { joins: 0, leaves: 0 };
      result.push({
        date: dateStr,
        joins: stats.joins,
        leaves: stats.leaves
      });
    }

    return result;
  }

  /**
   * Retrieves aggregated server hotspots combining PostgreSQL historical logs and real-time Redis memory buffer.
   */
  static async getLiveServerHotspots(tenantId: string, guildId: string) {
    const channelGroup = await prisma.user_channel_logs.groupBy({
      by: ['channelId'],
      where: { guildId, tenantId },
      _sum: { messages: true },
      orderBy: { _sum: { messages: 'desc' } }
    });

    const channelMap = new Map<string, number>();
    channelGroup.forEach(c => {
      channelMap.set(c.channelId, Number(c._sum.messages || 0));
    });

    // Fetch live channel metrics from Redis
    const today = new Date().toISOString().substring(0, 10);
    const pattern = `activity:channel:${tenantId}:${guildId}:*:*:*`;
    const keys = await RedisService.client.keys(pattern);

    for (const key of keys) {
      const parts = key.split(':'); // ['activity', 'channel', tenantId, guildId, userId, channelId, date]
      const channelId = parts[5];
      const dateStr = parts[6];

      if (dateStr === today) {
        const data = await RedisService.client.hgetall(key);
        if (data && data.messages) {
          const count = parseInt(data.messages, 10);
          channelMap.set(channelId, (channelMap.get(channelId) || 0) + count);
        }
      }
    }

    return Array.from(channelMap.entries())
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Retrieves leaderboard data combining historical database logs and real-time Redis memory buffer.
   */
  static async getLiveLeaderboardData(tenantId: string, guildId: string, category: string, timeframe: string) {
    const userMap = new Map<string, number>();

    // 1. Fetch from Database
    if (timeframe === 'all') {
      const column = category === 'voice' ? 'totalVoiceTime' : 
                     category === 'media' ? 'totalMedia' : 
                     category === 'emojis' ? 'totalEmojis' : 
                     category === 'reactions' ? 'totalReactions' : 'totalMessages';

      const statsList = await prisma.activity_stats.findMany({
        where: { guildId, tenantId }
      });

      statsList.forEach(s => {
        userMap.set(s.userId, Number(s[column] || 0));
      });
    } else {
      const daysLimit = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - daysLimit);

      const column = category === 'voice' ? 'voiceTime' : 
                     category === 'media' ? 'media' : 
                     category === 'emojis' ? 'emojis' : 
                     category === 'reactions' ? 'reactions' : 'messages';

      const logsList = await prisma.activity_logs.groupBy({
        by: ['userId'],
        where: {
          guildId,
          tenantId,
          date: { gte: limitDate }
        },
        _sum: {
          [column]: true
        }
      });

      logsList.forEach(l => {
        userMap.set(l.userId, Number(l._sum[column] || 0));
      });
    }

    // 2. Fetch and Merge Live Redis Buffers (which represent un-flushed telemetry from today)
    const redisField = category === 'voice' ? 'voiceTime' : 
                       category === 'media' ? 'media' : 
                       category === 'emojis' ? 'emojis' : 
                       category === 'reactions' ? 'reactions' : 'messages';

    const pattern = `activity:user:${tenantId}:${guildId}:*:*`;
    const keys = await RedisService.client.keys(pattern);

    for (const key of keys) {
      const parts = key.split(':'); // ['activity', 'user', tenantId, guildId, userId, date]
      const userId = parts[4];
      const data = await RedisService.client.hgetall(key);
      if (data && data[redisField]) {
        const count = parseInt(data[redisField], 10);
        userMap.set(userId, (userMap.get(userId) || 0) + count);
      }
    }

    // 3. Convert to Sorted Array and limit to top 100
    return Array.from(userMap.entries())
      .map(([userId, value]) => ({ userId, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 100);
  }

  /**
   * Periodically flushes all aggregated Redis keys to PostgreSQL using ultra-optimized bulk upserts.
   * Runs every 5 minutes.
   */
  static async flushTelemetryToDb() {
    Logger.loader('[ACTIVITY] Starting telemetric flush cron...');
    try {
      // 1. FLUSH USER ACTIVITY LOGS
      const userKeys = await RedisService.client.keys('activity:user:*');
      for (const key of userKeys) {
        const parts = key.split(':'); // ['activity', 'user', tenantId, guildId, userId, date]
        const tenantId = parts[2];
        const guildId = parts[3];
        const userId = parts[4];
        const dateStr = parts[5];
        const date = new Date(dateStr);

        const data = await RedisService.client.hgetall(key);
        if (!data || Object.keys(data).length === 0) continue;

        const messages = parseInt(data.messages || '0', 10);
        const voiceTime = parseInt(data.voiceTime || '0', 10);
        const media = parseInt(data.media || '0', 10);
        const emojis = parseInt(data.emojis || '0', 10);
        const reactions = parseInt(data.reactions || '0', 10);
        const links = parseInt(data.links || '0', 10);
        const commands = parseInt(data.commands || '0', 10);

        // Daily Logs Upsert
        await prisma.activity_logs.upsert({
          where: {
            guildId_userId_date_tenantId: { guildId, userId, date, tenantId }
          },
          update: {
            messages: { increment: messages },
            voiceTime: { increment: voiceTime },
            media: { increment: media },
            emojis: { increment: emojis },
            reactions: { increment: reactions },
            links: { increment: links },
            commands: { increment: commands }
          },
          create: {
            guildId, tenantId, userId, date,
            messages, voiceTime, media, emojis, reactions, links, commands
          }
        });

        // Cumulative Stats Upsert
        await prisma.activity_stats.upsert({
          where: {
            guildId_userId_tenantId: { guildId, userId, tenantId }
          },
          update: {
            totalMessages: { increment: messages },
            totalVoiceTime: { increment: voiceTime },
            totalMedia: { increment: media },
            totalEmojis: { increment: emojis },
            totalReactions: { increment: reactions },
            totalLinks: { increment: links },
            totalCommands: { increment: commands },
            updatedAt: new Date()
          },
          create: {
            guildId, tenantId, userId,
            totalMessages: messages,
            totalVoiceTime: BigInt(voiceTime),
            totalMedia: BigInt(media),
            totalEmojis: BigInt(emojis),
            totalReactions: BigInt(reactions),
            totalLinks: BigInt(links),
            totalCommands: BigInt(commands),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        await RedisService.client.del(key);
      }

      // 2. FLUSH CHANNEL ACTIVITY LOGS
      const channelKeys = await RedisService.client.keys('activity:channel:*');
      for (const key of channelKeys) {
        const parts = key.split(':'); // ['activity', 'channel', tenantId, guildId, userId, channelId, date]
        const tenantId = parts[2];
        const guildId = parts[3];
        const userId = parts[4];
        const channelId = parts[5];
        const dateStr = parts[6];
        const date = new Date(dateStr);

        const data = await RedisService.client.hgetall(key);
        if (!data || Object.keys(data).length === 0) continue;

        const messages = parseInt(data.messages || '0', 10);

        await prisma.user_channel_logs.upsert({
          where: {
            guildId_userId_channelId_date_tenantId: { guildId, userId, channelId, date, tenantId }
          },
          update: {
            messages: { increment: messages }
          },
          create: {
            guildId, tenantId, userId, channelId, date,
            messages
          }
        });

        await RedisService.client.del(key);
      }

      // 3. FLUSH SERVER GROWTH LOGS
      const serverKeys = await RedisService.client.keys('activity:server:*');
      for (const key of serverKeys) {
        const parts = key.split(':'); // ['activity', 'server', tenantId, guildId, date]
        const tenantId = parts[2];
        const guildId = parts[3];
        const dateStr = parts[4];
        const date = new Date(dateStr);

        const data = await RedisService.client.hgetall(key);
        if (!data || Object.keys(data).length === 0) continue;

        const joins = parseInt(data.joins || '0', 10);
        const leaves = parseInt(data.leaves || '0', 10);
        const peakVoice = parseInt(data.peakVoice || '0', 10);

        await prisma.server_activity_logs.upsert({
          where: {
            guildId_date_tenantId: { guildId, date, tenantId }
          },
          update: {
            joins: { increment: joins },
            leaves: { increment: leaves },
            peakVoice: peakVoice > 0 ? { multiply: 1 } : undefined // Placeholder
          },
          create: {
            guildId, tenantId, date,
            joins, leaves, peakVoice
          }
        });

        await RedisService.client.del(key);
      }

      Logger.loader('[ACTIVITY] Telemetric flush completed successfully.');
    } catch (err) {
      Logger.error('[ACTIVITY] Failed to flush telemetry keys', err);
    }
  }

  /**
   * Generates a stunning Donut Chart for user channel split using skia-canvas.
   */
  static async drawChannelDonutChart(username: string, channels: ChannelStatsInput[]): Promise<AttachmentBuilder> {
    const canvas = new Canvas(600, 350);
    const ctx = canvas.getContext('2d');

    // 1. Draw Glassmorphic Cyber Dark Background
    const gradient = ctx.createRadialGradient(300, 175, 50, 300, 175, 300);
    gradient.addColorStop(0, '#1a1b2f');
    gradient.addColorStop(1, '#0e0f19');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 350);

    // Subtle Glass Board Frame
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(10, 10, 580, 330);

    // 2. Draw Donut Chart
    const centerX = 200;
    const centerY = 175;
    const outerRadius = 100;
    const innerRadius = 65;

    const totalMessages = channels.reduce((sum, c) => sum + c.count, 0);

    let startAngle = -Math.PI / 2;
    const colors = ['#7367F0', '#00CFE8', '#28C76F', '#FF9F43', '#EA5455'];

    if (totalMessages === 0) {
      // Draw Empty Donut
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1a1b2f';
      ctx.fill();
    } else {
      channels.forEach((chan, idx) => {
        const sliceAngle = (chan.count / totalMessages) * (2 * Math.PI);
        const endAngle = startAngle + sliceAngle;

        // Draw Outer Slice
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();

        const segmentGrad = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
        segmentGrad.addColorStop(0, colors[idx % colors.length]);
        segmentGrad.addColorStop(1, adjustColorBrightness(colors[idx % colors.length], -20));

        ctx.fillStyle = segmentGrad;
        ctx.fill();

        // White subtle border for visual spacing
        ctx.strokeStyle = '#0e0f19';
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle = endAngle;
      });

      // Clear Inner Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0e0f19';
      ctx.fill();
    }

    // 3. Draw Legend Text on the Right
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(username.substring(0, 15), 360, 50);

    ctx.font = '13px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('TOP ACTIVE CHANNELS', 360, 75);

    let legendY = 110;
    channels.forEach((chan, idx) => {
      const percentage = totalMessages > 0 ? Math.round((chan.count / totalMessages) * 100) : 0;

      // Color Dot
      ctx.beginPath();
      ctx.arc(370, legendY, 6, 0, 2 * Math.PI);
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fill();

      // Label Text
      ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`#${chan.channelId}`, 390, legendY);

      ctx.font = '13px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`${chan.count} msgs (${percentage}%)`, 390, legendY + 18);

      legendY += 45;
    });

    const buffer = await canvas.toBuffer('png');
    return new AttachmentBuilder(buffer, { name: 'donut_chart.png' });
  }

  /**
   * Generates a custom Joins/Leaves line & bar graph using skia-canvas.
   */
  static async drawServerGrowthChart(growthData: { date: string; joins: number; leaves: number }[]): Promise<AttachmentBuilder> {
    const canvas = new Canvas(700, 380);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f1020';
    ctx.fillRect(0, 0, 700, 380);

    // Border
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(15, 15, 670, 350);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SERVER TRAFFIC REPORT (LAST 7 DAYS)', 40, 45);

    // Axis Setup
    const chartX = 60;
    const chartY = 80;
    const chartWidth = 580;
    const chartHeight = 220;

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = chartY + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(chartX, y);
      ctx.lineTo(chartX + chartWidth, y);
      ctx.stroke();
    }

    const maxVal = Math.max(...growthData.map(d => Math.max(d.joins, d.leaves, 5)));
    const stepX = chartWidth / Math.max(1, growthData.length - 1);

    // Draw Leaves Line
    ctx.strokeStyle = '#EA5455'; // Red
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    growthData.forEach((d, idx) => {
      const x = chartX + idx * stepX;
      const y = chartY + chartHeight - (d.leaves / maxVal) * chartHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Joins Line
    ctx.strokeStyle = '#28C76F'; // Green
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    growthData.forEach((d, idx) => {
      const x = chartX + idx * stepX;
      const y = chartY + chartHeight - (d.joins / maxVal) * chartHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw X-Axis Labels (Dates)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    growthData.forEach((d, idx) => {
      const x = chartX + idx * stepX;
      ctx.fillText(d.date.substring(5), x, chartY + chartHeight + 20);
    });

    // Draw Legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#28C76F';
    ctx.beginPath(); ctx.arc(520, 42, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Joins', 532, 42);

    ctx.fillStyle = '#EA5455';
    ctx.beginPath(); ctx.arc(600, 42, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Leaves', 612, 42);

    const buffer = await canvas.toBuffer('png');
    return new AttachmentBuilder(buffer, { name: 'growth_chart.png' });
  }

  /**
   * Helper to determine User Persona text based on highest stats.
   */
  static getPersonaText(stats: any): string {
    const messages = Number(stats.totalMessages || 0);
    const media = Number(stats.totalMedia || 0);
    const emojis = Number(stats.totalEmojis || 0);
    const links = Number(stats.totalLinks || 0);
    const voice = Number(stats.totalVoiceTime || 0);

    const max = Math.max(messages, media * 2, emojis * 1.5, links * 3, Math.floor(voice / 60) * 2);

    if (max === Math.floor(voice / 60) * 2 && voice > 0) return 'Vocal Elite 🔊';
    if (max === media * 2 && media > 0) return 'Media Mogul 🖼️';
    if (max === emojis * 1.5 && emojis > 0) return 'Emote Enthusiast 😀';
    if (max === links * 3 && links > 0) return 'Information Curator 🔗';
    return 'Chat Specialist 💬';
  }
}

/**
 * Adjusts hex color brightness.
 */
function adjustColorBrightness(hex: string, percent: number): string {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = Math.max(0, Math.min(255, R + percent));
  G = Math.max(0, Math.min(255, G + percent));
  B = Math.max(0, Math.min(255, B + percent));

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}
