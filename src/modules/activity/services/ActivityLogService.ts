import { Guild, GuildMember, TextChannel } from 'discord.js';
import { AuditLogEvent } from 'discord.js';
import { prisma } from '../../../database/client';
import { ContainerService, sendV2 } from '../../../utils/container';
import { Logger } from '../../../utils/logger';

export type ActivityLogScope = 'bot' | 'server';
export type ActivityLogType =
  | 'command'
  | 'member_join'
  | 'member_leave'
  | 'member_update'
  | 'voice_state'
  | 'message_delete';

// Extended log types
export type ExtendedActivityLogType = ActivityLogType | (
  | 'role_change'
  | 'message_update'
  | 'message_reaction_add'
  | 'message_reaction_remove'
  | 'channel_create'
  | 'channel_delete'
  | 'channel_update'
  | 'role_create'
  | 'role_delete'
  | 'role_update'
  | 'guild_update'
  | 'guild_ban_add'
  | 'guild_ban_remove'
  | 'emoji_update'
  | 'presence_update'
);

export interface ActivityLoggerConfig {
  botLogChannelId?: string;
  serverLogChannelId?: string;
  botLogTypes?: ActivityLogType[];
  serverLogTypes?: ActivityLogType[];
  inactivityRoleId?: string;
  inactivityDays?: number;
}

const DEFAULT_LOG_CONFIG: ActivityLoggerConfig = {
  botLogTypes: [],
  serverLogTypes: [],
  inactivityDays: 7
};

const BOT_LOG_TYPE_LABELS: Record<string, string> = {
  command: 'Slash/Prefix Commands',
  member_join: 'Member Join',
  member_leave: 'Member Leave',
  member_update: 'Profile Updates',
  voice_state: 'Voice Channel Activity',
  message_delete: 'Message Deletions'
};

const SERVER_LOG_TYPE_LABELS: Record<string, string> = {
  ...BOT_LOG_TYPE_LABELS,
  role_change: 'Role Changes',
  message_update: 'Message Edits',
  message_reaction_add: 'Reaction Added',
  message_reaction_remove: 'Reaction Removed',
  presence_update: 'Presence Update',
  channel_create: 'Channel Created',
  channel_delete: 'Channel Deleted',
  channel_update: 'Channel Updated',
  role_create: 'Role Created',
  role_delete: 'Role Deleted',
  role_update: 'Role Updated',
  guild_update: 'Server Updated',
  guild_ban_add: 'Member Banned',
  guild_ban_remove: 'Member Unbanned',
  emoji_update: 'Emoji Updated'
};

export class ActivityLogService {
  static async getSettings(tenantId: string, guildId: string): Promise<ActivityLoggerConfig> {
    try {
      const settings = await prisma.server_settings.findUnique({
        where: {
          guildId_tenantId: {
            guildId,
            tenantId
          }
        },
        select: {
          activityLogConfig: true as const
        }
      }) as { activityLogConfig: unknown } | null;

      if (!settings?.activityLogConfig) return DEFAULT_LOG_CONFIG;
      return typeof settings.activityLogConfig === 'string'
        ? JSON.parse(settings.activityLogConfig as string)
        : (settings.activityLogConfig as ActivityLoggerConfig);
    } catch (error) {
      Logger.error('[ActivityLogService] Failed to read activity log settings', error);
      return DEFAULT_LOG_CONFIG;
    }
  }

  static async fetchAuditExecutor(guild: Guild, action: keyof typeof AuditLogEvent | number, targetId?: string) {
    try {
      const logs = await guild.fetchAuditLogs({ limit: 5, type: action as any });
      if (!logs) return null;
      const entries = Array.from(logs.entries.values());
      if (entries.length === 0) return null;
      // Prefer exact target match if provided
      if (targetId) {
        const exact = entries.find(e => String((e.target as any)?.id) === String(targetId));
        if (exact) return { executorTag: exact.executor?.tag, executorId: exact.executor?.id, reason: exact.reason };
      }
      const first = entries[0];
      return { executorTag: first.executor?.tag, executorId: first.executor?.id, reason: first.reason };
    } catch (err) {
      Logger.error('[ActivityLogService] Failed to fetch audit logs', err);
      return null;
    }
  }

  static async upsertSettings(tenantId: string, guildId: string, config: ActivityLoggerConfig) {
    try {
      await prisma.server_settings.upsert({
        where: {
          guildId_tenantId: {
            guildId,
            tenantId
          }
        },
        create: {
          guildId,
          tenantId,
          activityLogConfig: config as any
        },
        update: {
          activityLogConfig: config as any
        }
      });
    } catch (error) {
      Logger.error('[ActivityLogService] Failed to persist activity log settings', error);
    }
  }

  static async setChannel(tenantId: string, guildId: string, scope: ActivityLogScope, channelId: string) {
    const current = await this.getSettings(tenantId, guildId);
    const next = {
      ...current,
      botLogChannelId: scope === 'bot' ? channelId : current.botLogChannelId,
      serverLogChannelId: scope === 'server' ? channelId : current.serverLogChannelId
    };

    await this.upsertSettings(tenantId, guildId, next);
    return next;
  }

  static async toggleType(
    tenantId: string,
    guildId: string,
    scope: ActivityLogScope,
    type: ActivityLogType,
    enabled: boolean
  ) {
    const current = await this.getSettings(tenantId, guildId);
    const targetKey = scope === 'bot' ? 'botLogTypes' : 'serverLogTypes';
    const activeTypes = new Set<string>(current[targetKey] || []);

    if (enabled) {
      activeTypes.add(type);
    } else {
      activeTypes.delete(type);
    }

    const next = {
      ...current,
      [targetKey]: Array.from(activeTypes)
    } as ActivityLoggerConfig;

    await this.upsertSettings(tenantId, guildId, next);
    return next;
  }

  static isTypeEnabled(
    settings: ActivityLoggerConfig,
    scope: ActivityLogScope,
    type: string
  ) {
    const targetKey = scope === 'bot' ? 'botLogTypes' : 'serverLogTypes';
    return Array.isArray(settings[targetKey]) && settings[targetKey]!.includes(type as any);
  }

  static getTypeReadable(type: ActivityLogType) {
    return BOT_LOG_TYPE_LABELS[type] || SERVER_LOG_TYPE_LABELS[type] || type;
  }

  static async resolveChannel(guild: Guild, channelId?: string) {
    if (!channelId) return null;
    try {
      const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (channel?.isTextBased()) return channel;
      const fetched = await guild.channels.fetch(channelId).catch(() => null);
      if (fetched && fetched.isTextBased()) return fetched as TextChannel;
    } catch {
      return null;
    }
    return null;
  }

  static async sendBotCommandLog(guild: Guild, tenantId: string, details: {
    commandName: string;
    userTag: string;
    userId: string;
    channelId?: string;
    channelName?: string;
    source: 'slash' | 'prefix';
  }) {
    const settings = await this.getSettings(tenantId, guild.id);
    if (!this.isTypeEnabled(settings, 'bot', 'command')) return;

    const channel = await this.resolveChannel(guild, settings.botLogChannelId);
    if (!channel) return;

    const container = ContainerService.create({
      title: `🤖 Bot Log • ${details.source === 'slash' ? 'Slash Command' : 'Prefix Command'}`,
      description: `A bot command was executed in ${details.channelName || `<#${details.channelId || 'unknown'}>`}.`,
      fields: [
        { name: 'Command', value: `
\`/${details.commandName}\`` },
        { name: 'User', value: `${details.userTag} (${details.userId})` },
        { name: 'Channel', value: details.channelName ? `#${details.channelName}` : `<#${details.channelId || 'unknown'}>` },
        { name: 'Type', value: details.source === 'slash' ? 'Slash Command' : 'Prefix Command' }
      ],
      color: '#7367F0',
      footer: `Activity Logger • ${tenantId}`
    });

    await sendV2(channel, container).catch(err => Logger.error('[ActivityLogService] Bot log send failed', err));
  }

  static async sendServerLog(guild: Guild, tenantId: string, type: ExtendedActivityLogType, payload: any) {
    const settings = await this.getSettings(tenantId, guild.id);
    if (!this.isTypeEnabled(settings, 'server', type)) return;

    const channel = await this.resolveChannel(guild, settings.serverLogChannelId);
    if (!channel) return;

    const container = this.buildServerLogContainer(type, payload, tenantId);
    if (!container) return;

    await sendV2(channel, container).catch(err => Logger.error('[ActivityLogService] Server log send failed', err));
  }

  private static buildServerLogContainer(type: ActivityLogType | string, payload: any, tenantId: string) {
    switch (type) {
      case 'member_join':
        return ContainerService.create({
          title: '👋 Member Joined',
          description: `${payload.member.user.tag} joined the server.`,
          fields: [
            { name: 'Member', value: `${payload.member.user.tag} (${payload.member.id})` },
            { name: 'Account Created', value: `${payload.member.user.createdAt?.toISOString() || 'Unknown'}` }
          ],
          color: '#28C76F',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'member_leave':
        return ContainerService.create({
          title: '👋 Member Left',
          description: `${payload.member.user.tag} left the server.`,
          fields: [
            { name: 'Member', value: `${payload.member.user.tag} (${payload.member.id})` },
            { name: 'When', value: new Date().toISOString() }
          ],
          color: '#EA5455',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'member_update': {
        const changes = payload.changes as string[];
        return ContainerService.create({
          title: '✏️ Profile Updated',
          description: `${payload.member.user.tag} updated their profile.`,
          fields: [
            { name: 'Member', value: `${payload.member.user.tag} (${payload.member.id})` },
            { name: 'Changes', value: changes.length ? changes.join('\n') : 'No visible profile changes detected.' }
          ],
          color: '#FF9F43',
          footer: `Activity Logger • ${tenantId}`
        });
      }
      case 'voice_state':
        return ContainerService.create({
          title: '🔊 Voice Channel Activity',
          description: `${payload.member.user.tag} ${payload.event === 'join' ? 'joined' : 'left'} voice chat.`,
          fields: [
            { name: 'Member', value: `${payload.member.user.tag} (${payload.member.id})` },
            { name: 'Channel', value: payload.channelName ? `#${payload.channelName}` : `Unknown` },
            { name: 'Event', value: payload.event === 'join' ? 'Voice Join' : 'Voice Leave' }
          ],
          color: '#00CFE8',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'message_delete':
        return ContainerService.create({
          title: '🗑️ Message Deleted',
          description: `A message was removed from ${payload.channelName || `<#${payload.channelId || 'unknown'}>`}.`,
          fields: [
            { name: 'Author', value: `${payload.authorTag || 'Unknown'} (${payload.authorId || 'Unknown'})` },
            { name: 'Channel', value: payload.channelName ? `#${payload.channelName}` : `<#${payload.channelId || 'unknown'}>` },
            { name: 'Content', value: payload.content ? payload.content.slice(0, 1000) : '*Unavailable*' }
          ],
          color: '#FF6B6B',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'message_update':
        return ContainerService.create({
          title: '✏️ Message Edited',
          description: `A message was edited in ${payload.channelName || `<#${payload.channelId || 'unknown'}>`}.`,
          fields: [
            { name: 'Author', value: `${payload.authorTag || 'Unknown'} (${payload.authorId || 'Unknown'})` },
            { name: 'Channel', value: payload.channelName ? `#${payload.channelName}` : `<#${payload.channelId || 'unknown'}>` },
            { name: 'Before', value: payload.before ? payload.before.slice(0, 1000) : '*Unavailable*' },
            { name: 'After', value: payload.after ? payload.after.slice(0, 1000) : '*Unavailable*' }
          ],
          color: '#FFB86B',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'message_reaction_add':
      case 'message_reaction_remove':
        return ContainerService.create({
          title: type === 'message_reaction_add' ? '➕ Reaction Added' : '➖ Reaction Removed',
          description: `A reaction event occurred in ${payload.channelName || `<#${payload.channelId || 'unknown'}>`}.`,
          fields: [
            { name: 'Message Author', value: `${payload.authorTag || 'Unknown'} (${payload.authorId || 'Unknown'})` },
            { name: 'Reactor', value: `${payload.userTag || 'Unknown'} (${payload.userId || 'Unknown'})` },
            { name: 'Reaction', value: `${payload.emoji || 'Unknown'}` }
          ],
          color: '#7367F0',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'role_change':
        return ContainerService.create({
          title: '🔐 Role Changes',
          description: `${payload.member.user.tag} had roles updated.`,
          fields: [
            { name: 'Member', value: `${payload.member.user.tag} (${payload.member.id})` },
            { name: 'Added Roles', value: (payload.added || []).length ? (payload.added.map((r:any)=>`${r.name} (${r.id})`).join('\n')) : '*None*' },
            { name: 'Removed Roles', value: (payload.removed || []).length ? (payload.removed.map((r:any)=>`${r.name} (${r.id})`).join('\n')) : '*None*' }
          ],
          color: '#00CFE8',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'channel_create':
        return ContainerService.create({
          title: '📢 Channel Created',
          description: `Channel ${payload.channel?.name || payload.channelId} was created.`,
          fields: [
            { name: 'Channel', value: `${payload.channel?.name || payload.channelId}` },
            { name: 'Type', value: `${payload.channel?.type || 'Unknown'}` }
          ],
          color: '#28C76F',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'channel_delete':
        return ContainerService.create({
          title: '🗑️ Channel Deleted',
          description: `Channel ${payload.channel?.name || payload.channelId} was deleted.`,
          fields: [
            { name: 'Channel', value: `${payload.channel?.name || payload.channelId}` }
          ],
          color: '#EA5455',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'channel_update':
        return ContainerService.create({
          title: '✏️ Channel Updated',
          description: `Channel ${payload.channel?.name || payload.channelId} was updated.`,
          fields: [
            { name: 'Channel', value: `${payload.channel?.name || payload.channelId}` },
            { name: 'Changes', value: payload.changes?.length ? payload.changes.join('\n') : '*Unknown*' }
          ],
          color: '#FF9F43',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'role_create':
      case 'role_delete':
      case 'role_update':
        return ContainerService.create({
          title: type === 'role_create' ? '🆕 Role Created' : type === 'role_delete' ? '🗑️ Role Deleted' : '✏️ Role Updated',
          description: `Role ${payload.role?.name || payload.roleId} ${type === 'role_create' ? 'was created' : type === 'role_delete' ? 'was deleted' : 'was updated'}.`,
          fields: [
            { name: 'Role', value: `${payload.role?.name || payload.roleId}` },
            ...(payload.changes ? [{ name: 'Changes', value: payload.changes.join('\n') }] : [])
          ],
          color: '#7367F0',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'guild_update':
        return ContainerService.create({
          title: '🏛️ Server Updated',
          description: `Server settings were updated.`,
          fields: [
            { name: 'Changes', value: payload.changes?.length ? payload.changes.join('\n') : '*Unknown*' }
          ],
          color: '#7367F0',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'guild_ban_add':
      case 'guild_ban_remove':
        return ContainerService.create({
          title: type === 'guild_ban_add' ? '⛔ Member Banned' : '✅ Member Unbanned',
          description: `${payload.userTag || payload.userId} ${type === 'guild_ban_add' ? 'was banned' : 'was unbanned'}.`,
          fields: [
            { name: 'User', value: `${payload.userTag || payload.userId}` },
            ...(payload.reason ? [{ name: 'Reason', value: payload.reason }] : [])
          ],
          color: type === 'guild_ban_add' ? '#EA5455' : '#28C76F',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'emoji_update':
        return ContainerService.create({
          title: '🎭 Emoji Updated',
          description: `Server emoji list was updated.`,
          fields: [
            { name: 'Changes', value: payload.changes?.length ? payload.changes.join('\n') : '*Unknown*' }
          ],
          color: '#7367F0',
          footer: `Activity Logger • ${tenantId}`
        });
      case 'presence_update':
        return ContainerService.create({
          title: '👀 Presence Update',
          description: `A member's presence changed.`,
          fields: [
            { name: 'Member', value: `${payload.user.tag} (${payload.user.id})` },
            { name: 'Old', value: payload.oldStatus || '*Unknown*' },
            { name: 'New', value: payload.newStatus || '*Unknown*' }
          ],
          color: '#00CFE8',
          footer: `Activity Logger • ${tenantId}`
        });
      default:
        return null;
    }
  }

  static async buildStatusSummary(tenantId: string, guildId: string) {
    const settings = await this.getSettings(tenantId, guildId);
    const botChannel = settings.botLogChannelId ? `<#${settings.botLogChannelId}>` : '*Not configured*';
    const serverChannel = settings.serverLogChannelId ? `<#${settings.serverLogChannelId}>` : '*Not configured*';
    const botTypes = (settings.botLogTypes || []).map(type => this.getTypeReadable(type)).join('\n') || '*None*';
    const serverTypes = (settings.serverLogTypes || []).map(type => this.getTypeReadable(type)).join('\n') || '*None*';

    const inactivityRole = settings.inactivityRoleId ? `<@&${settings.inactivityRoleId}>` : '*Not configured*';
    const inactivityThreshold = settings.inactivityDays ? `${settings.inactivityDays} days` : '*Not configured*';

    return ContainerService.create({
      title: '📜 Activity Logger Configuration',
      description: '**Bot Logs** and **Server Logs** can be configured independently.',
      fields: [
        { name: 'Bot Log Channel', value: botChannel },
        { name: 'Bot Log Types', value: botTypes },
        { name: 'Server Log Channel', value: serverChannel },
        { name: 'Server Log Types', value: serverTypes },
        { name: 'Inactive Role', value: inactivityRole },
        { name: 'Inactivity Threshold', value: inactivityThreshold }
      ],
      color: '#7367F0',
      footer: `Activity Logger • ${tenantId}`
    });
  }
}
