import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import { ContainerService, replyV2 } from '../../../utils/container';
import { ActivityService } from '../services/ActivityService';
import { ActivityLogService } from '../services/ActivityLogService';
import { Translator } from '../../../core/Translator';
import { RoutingService } from '../../../services/RoutingService';
import { PrismaClient } from '@prisma/client';
import { flamebornConfig } from '../../../config/flameborn.config';

const prisma = new PrismaClient();
const USERS_PER_PAGE = 10;

export default {
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('📊 StatBot-grade server and user engagement analytics.')
    .addSubcommand(sub =>
      sub.setName('user')
         .setDescription('👤 View your personal active channel donut chart and overall dossier.')
         .addUserOption(opt => opt.setName('target').setDescription('The user to view stats for'))
    )
    .addSubcommand(sub =>
      sub.setName('server')
         .setDescription('🌐 View server growth charts, active hotspots, and dead channels.')
         .addStringOption(opt =>
           opt.setName('type')
              .setDescription('What report to render')
              .setRequired(true)
              .addChoices(
                { name: 'Growth (Joins/Leaves Chart)', value: 'growth' },
                { name: 'Channel Hotspots', value: 'hotspots' },
                { name: 'Inactive Members', value: 'inactive' }
              )
         )
    )
    .addSubcommand(sub =>
      sub.setName('inactive')
         .setDescription('⚠️ Configure inactivity tracking and auto-assign the inactive role.')
         .addRoleOption(opt =>
           opt.setName('role')
              .setDescription('Role to assign to inactive server members')
         )
         .addIntegerOption(opt =>
           opt.setName('duration')
              .setDescription('Days of no messages before a member is marked inactive')
              .setMinValue(1)
              .setMaxValue(30)
         )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
         .setDescription('🏆 View interactive active leaderboards.')
    )
    .addSubcommandGroup(group =>
      group.setName('log')
           .setDescription('Configure activity log channels and enabled types.')
           .addSubcommand(sub =>
             sub.setName('channel')
                .setDescription('Set the activity log channel for bot or server logs.')
                .addStringOption(opt =>
                  opt.setName('scope')
                     .setDescription('Which log group to configure')
                     .setRequired(true)
                     .addChoices(
                       { name: 'Bot Logs', value: 'bot' },
                       { name: 'Server Logs', value: 'server' }
                     )
                )
                .addChannelOption(opt =>
                  opt.setName('channel')
                     .setDescription('The channel to receive activity log messages.')
                     .addChannelTypes(ChannelType.GuildText)
                     .setRequired(true)
                )
           )
           .addSubcommand(sub =>
             sub.setName('type')
                .setDescription('Enable or disable a specific activity log type.')
                .addStringOption(opt =>
                  opt.setName('scope')
                     .setDescription('Select bot or server log type')
                     .setRequired(true)
                     .addChoices(
                       { name: 'Bot Logs', value: 'bot' },
                       { name: 'Server Logs', value: 'server' }
                     )
                )
                .addStringOption(opt =>
                  opt.setName('log_type')
                     .setDescription('Which log type to enable or disable')
                     .setRequired(true)
                     .addChoices(
                       { name: 'Commands', value: 'command' },
                       { name: 'Member Join', value: 'member_join' },
                       { name: 'Member Leave', value: 'member_leave' },
                       { name: 'Profile Updates', value: 'member_update' },
                       { name: 'Voice Activity', value: 'voice_state' },
                       { name: 'Message Deletions', value: 'message_delete' },
                       { name: 'Message Edits', value: 'message_update' },
                       { name: 'Reaction Added', value: 'message_reaction_add' },
                       { name: 'Reaction Removed', value: 'message_reaction_remove' },
                       { name: 'Presence Update', value: 'presence_update' },
                       { name: 'Role Changes', value: 'role_change' },
                       { name: 'Role Created', value: 'role_create' },
                       { name: 'Role Deleted', value: 'role_delete' },
                       { name: 'Role Updated', value: 'role_update' },
                       { name: 'Channel Created', value: 'channel_create' },
                       { name: 'Channel Deleted', value: 'channel_delete' },
                       { name: 'Channel Updated', value: 'channel_update' },
                       { name: 'Server Updated', value: 'guild_update' },
                       { name: 'Member Banned', value: 'guild_ban_add' },
                       { name: 'Member Unbanned', value: 'guild_ban_remove' },
                       { name: 'Emoji Updated', value: 'emoji_update' }
                     )
                )
                .addBooleanOption(opt =>
                  opt.setName('enabled')
                     .setDescription('Enable or disable the selected log type')
                     .setRequired(true)
                )
           )
           .addSubcommand(sub =>
             sub.setName('status')
                .setDescription('View current activity logger configuration.')
           )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const shim = interaction as any;
    const lang = shim.lang || 'en';
    const tenantId = await RoutingService.resolveTenantId(guildId, 'activity');

    // ==========================================
    // 1. SUBCOMMAND: USER DOSSIER
    // ==========================================
    if (subcommand === 'user') {
      const targetUser = interaction.options.getUser('target') || interaction.user;
      
      // Fetch cumulative stats combining DB and Redis buffer
      const stats = await ActivityService.getLiveUserStats(tenantId, guildId, targetUser.id);

      // Fetch top 3 active channels combining DB and Redis buffer
      const liveChannels = await ActivityService.getLiveUserChannelStats(tenantId, guildId, targetUser.id);
      const parsedChannels = liveChannels.slice(0, 3).map(c => {
        const chanObj = interaction.guild?.channels.cache.get(c.channelId);
        return {
          channelId: chanObj ? chanObj.name : c.channelId,
          count: c.count
        };
      });

      // Render Donut Chart
      const attachment = await ActivityService.drawChannelDonutChart(targetUser.username, parsedChannels);
      const persona = ActivityService.getPersonaText(stats);

      const embed = ContainerService.create({
        title: Translator.t('activity', 'user.title', lang, { username: targetUser.username }) || `📊 Activity Report: ${targetUser.username}`,
        description: `${Translator.t('activity', 'user.persona', lang, { persona }) || `👤 Persona: **${persona}**`}\n\n*Here is a complete summary of your activity style:*`,
        fields: [
          { name: '💬 Messages', value: stats.totalMessages.toString(), inline: true },
          { name: '🔊 Voice Hours', value: `${(Number(stats.totalVoiceTime) / 3600).toFixed(1)}h`, inline: true },
          { name: '🖼️ Media Uploads', value: stats.totalMedia.toString(), inline: true },
          { name: '😀 Emojis Used', value: stats.totalEmojis.toString(), inline: true },
          { name: '❤️ Reactions Given', value: stats.totalReactions.toString(), inline: true },
          { name: '🤖 Commands Run', value: stats.totalCommands.toString(), inline: true }
        ],
        image: 'attachment://donut_chart.png',
        color: '#7367F0',
        footer: true,
        interaction
      });

      // Send V2 stats container first, then follow up with the canvas chart
      await replyV2(interaction, embed);
      await interaction.followUp({ files: [attachment] });
      return;
    }

    if (subcommand === 'inactive') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return await replyV2(interaction, ContainerService.simple('❌ You need Manage Server permissions to configure inactivity tracking.', { interaction }));
      }

      const role = interaction.options.getRole('role');
      const duration = interaction.options.getInteger('duration');
      const current = await ActivityLogService.getSettings(tenantId, guildId);

      if (!role && duration === null) {
        const roleDisplay = current.inactivityRoleId ? `<@&${current.inactivityRoleId}>` : '*Not configured*';
        const daysDisplay = current.inactivityDays ? `${current.inactivityDays} days` : '*Not configured*';
        return await replyV2(interaction, ContainerService.create({
          title: '⚠️ Inactivity Tracker Status',
          description: 'Current inactive role and threshold configuration.',
          fields: [
            { name: 'Inactive Role', value: roleDisplay },
            { name: 'Inactivity Duration', value: daysDisplay }
          ],
          color: '#FF9F43',
          footer: true,
          interaction
        }));
      }

      const updatedConfig = {
        ...current,
        inactivityRoleId: role ? role.id : current.inactivityRoleId,
        inactivityDays: duration ?? current.inactivityDays
      };

      await ActivityLogService.upsertSettings(tenantId, guildId, updatedConfig);

      return await replyV2(interaction, ContainerService.create({
        title: '✅ Inactivity Tracker Updated',
        description: 'Inactive members will now be assigned the configured role when they have not sent messages within the threshold.',
        fields: [
          { name: 'Inactive Role', value: updatedConfig.inactivityRoleId ? `<@&${updatedConfig.inactivityRoleId}>` : '*Not configured*' },
          { name: 'Inactivity Duration', value: updatedConfig.inactivityDays ? `${updatedConfig.inactivityDays} days` : '*Not configured*' }
        ],
        color: '#28C76F',
        footer: true,
        interaction
      }));
    }

    // ==========================================
    // 2. SUBCOMMAND: SERVER TELEMETRY
    // ==========================================
    if (subcommandGroup === 'log') {
      const scope = interaction.options.getString('scope', true) as 'bot' | 'server';

      if (subcommand === 'channel') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return await replyV2(interaction, ContainerService.simple('❌ You need Manage Server permissions to configure activity logs.', { interaction }));
        }

        const channel = interaction.options.getChannel('channel', true);
        const config = await ActivityLogService.setChannel(tenantId, guildId, scope, channel.id);

        return await replyV2(interaction, ContainerService.create({
          title: '✅ Activity Log Channel Updated',
          description: `**${scope === 'bot' ? 'Bot' : 'Server'} logs** will now post to <#${channel.id}>.`, 
          fields: [
            { name: 'Scope', value: scope === 'bot' ? 'Bot Logs' : 'Server Logs' },
            { name: 'Channel', value: `<#${channel.id}>` },
            { name: 'Enabled Types', value: (config[scope === 'bot' ? 'botLogTypes' : 'serverLogTypes'] || []).map((type: string) => ActivityLogService.getTypeReadable(type as any)).join('\n') || '*None*' }
          ],
          color: '#28C76F',
          footer: true,
          interaction
        }));
      }

      if (subcommand === 'type') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return await replyV2(interaction, ContainerService.simple('❌ You need Manage Server permissions to configure activity logs.', { interaction }));
        }

        const logType = interaction.options.getString('log_type', true) as any;
        const enabled = interaction.options.getBoolean('enabled', true);
        const config = await ActivityLogService.toggleType(tenantId, guildId, scope, logType, enabled);

        return await replyV2(interaction, ContainerService.create({
          title: `${enabled ? '✅ Enabled' : '🚫 Disabled'} Activity Log Type`,
          description: `**${ActivityLogService.getTypeReadable(logType)}** for **${scope === 'bot' ? 'Bot' : 'Server'} logs** has been ${enabled ? 'enabled' : 'disabled'}.`, 
          fields: [
            { name: 'Scope', value: scope === 'bot' ? 'Bot Logs' : 'Server Logs' },
            { name: 'Log Type', value: ActivityLogService.getTypeReadable(logType) },
            { name: 'Current Active Types', value: (config[scope === 'bot' ? 'botLogTypes' : 'serverLogTypes'] || []).map((type: string) => ActivityLogService.getTypeReadable(type as any)).join('\n') || '*None*' }
          ],
          color: enabled ? '#28C76F' : '#FF9F43',
          footer: true,
          interaction
        }));
      }

      if (subcommand === 'status') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return await replyV2(interaction, ContainerService.simple('❌ You need Manage Server permissions to view activity logger settings.', { interaction }));
        }

        const container = await ActivityLogService.buildStatusSummary(tenantId, guildId);
        return await replyV2(interaction, container);
      }
    }

    if (subcommand === 'server') {
      const type = interaction.options.getString('type', true);

      if (type === 'growth') {
        // Fetch logs combining DB and Redis buffer
        const growthData = await ActivityService.getLiveServerGrowth(tenantId, guildId);

        const attachment = await ActivityService.drawServerGrowthChart(growthData);

        const embed = ContainerService.create({
          title: Translator.t('activity', 'server.title', lang) || '🌐 Server Telemetry Dashboard',
          description: `Daily traffic report visualizing server gains and member attrition trends.`,
          image: 'attachment://growth_chart.png',
          color: '#28C76F',
          footer: true,
          interaction
        });

        // Send V2 stats container first, then follow up with the canvas chart
        await replyV2(interaction, embed);
        await interaction.followUp({ files: [attachment] });
        return;
      }

      if (type === 'inactive') {
        const settings = await ActivityLogService.getSettings(tenantId, guildId);
        const days = settings.inactivityDays || 7;
        const inactiveIds = await ActivityService.getInactiveMembers(interaction.guild!, tenantId, days);

        const PAGE_SIZE = 10;
        let page = 0;
        const totalPages = Math.max(1, Math.ceil(inactiveIds.length / PAGE_SIZE));

        const buildInactiveContainer = (currentPage: number) => {
          const pageIds = inactiveIds.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
          const inactiveList = pageIds.length
            ? pageIds.map(id => `<@${id}>`).join('\n')
            : '*No inactive members found on this page.*';

          const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('activity_inactive_prev')
              .setLabel('◀ Prev')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('activity_inactive_next')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage >= totalPages - 1)
          );

          return ContainerService.create({
            title: '⚠️ Inactive Members Report',
            description: `Members who have not sent any messages in the last ${days} day${days === 1 ? '' : 's'}.`,
            fields: [
              { name: 'Total Inactive Members', value: inactiveIds.length.toString(), inline: true },
              { name: 'Page', value: `${currentPage + 1}/${totalPages}`, inline: true },
              { name: 'Inactive Members', value: inactiveList }
            ],
            components: [controls],
            color: '#FF9F43',
            footer: true,
            interaction
          });
        };

        const initial = buildInactiveContainer(page);
        await replyV2(interaction, initial);
        const response = await interaction.fetchReply();

        const collector = response.createMessageComponentCollector({
          time: flamebornConfig.behavior.collectorTimeout || 60000
        });

        collector.on('collect', async (i: any) => {
          if (i.user.id !== interaction.user.id) {
            return await replyV2(i, ContainerService.simple('❌ You cannot interact with this report.', { interaction: i }));
          }

          await i.deferUpdate();

          if (i.customId === 'activity_inactive_prev' && page > 0) {
            page -= 1;
          } else if (i.customId === 'activity_inactive_next' && page < totalPages - 1) {
            page += 1;
          }

          const updated = buildInactiveContainer(page);
          await replyV2(i, updated);
        });

        collector.on('end', async () => {
          const expiredControls = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('activity_inactive_prev')
              .setLabel('◀ Prev')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('activity_inactive_next')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          const expired = ContainerService.create({
            title: '⚠️ Inactive Members Report (Expired)',
            description: `Members who have not sent any messages in the last ${days} day${days === 1 ? '' : 's'}.`,
            fields: [
              { name: 'Total Inactive Members', value: inactiveIds.length.toString(), inline: true },
              { name: 'Page', value: `${page + 1}/${totalPages}`, inline: true },
              { name: 'Inactive Members', value: inactiveIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(id => `<@${id}>`).join('\n') || '*No inactive members found on this page.*' }
            ],
            components: [expiredControls],
            color: '#FF9F43',
            footer: true,
            interaction
          });

          await replyV2(interaction, expired).catch(() => {});
        });

        return;
      }

      if (type === 'hotspots') {
        // Fetch top active channels combining historical DB and live Redis buffer
        const liveHotspots = await ActivityService.getLiveServerHotspots(tenantId, guildId);
        const topChannels = liveHotspots.slice(0, 5);

        let hotspotsText = '**Top Active Channels:**\n';
        if (topChannels.length === 0) hotspotsText += '*No chat logs registered yet.*';
        else {
          topChannels.forEach((c, idx) => {
            hotspotsText += `**${idx + 1}.** <#${c.channelId}>: \`${c.count}\` messages\n`;
          });
        }

        // Detect Dead Channels (Channels in cache/guild with zero messages in database or live buffer)
        const activeChannels = liveHotspots.map(tc => tc.channelId);
        const allGuildTextChannels = interaction.guild?.channels.cache
          .filter(c => c.type === ChannelType.GuildText)
          .map(c => c.id) || [];
        
        const deadChannels = allGuildTextChannels.filter(cid => !activeChannels.includes(cid)).slice(0, 5);

        let deadText = '\n❄️ **Dead Channels Alert (No active logs):**\n';
        if (deadChannels.length === 0) deadText += '*Every text channel is active! Great job!*';
        else {
          deadText += deadChannels.map(cid => `• <#${cid}>`).join('\n');
        }

        const embed = ContainerService.create({
          title: Translator.t('activity', 'server.hotspots_title', lang) || '🔥 Active Channels Ranking',
          description: `${hotspotsText}\n${deadText}`,
          color: '#FF9F43',
          footer: true,
          interaction
        });

        return await replyV2(interaction, embed);
      }
    }

    // ==========================================
    // 3. SUBCOMMAND: LEADERBOARD (DYNAMIC INTERACTIVE)
    // ==========================================
    if (subcommand === 'leaderboard') {
      let currentCategory = 'messages';
      let currentTimeframe = 'all';
      let page = 0;

      const generateLbContainer = async () => {
        // Fetch leaderboard combining historical DB and live Redis buffer
        const lbData = await ActivityService.getLiveLeaderboardData(tenantId, guildId, currentCategory, currentTimeframe);

        const totalPages = Math.ceil(lbData.length / USERS_PER_PAGE);
        const paginatedData = lbData.slice(page * USERS_PER_PAGE, (page + 1) * USERS_PER_PAGE);

        // Formatting Helpers
        const formatVal = (val: number) => {
          if (currentCategory === 'voice') {
            const h = Math.floor(val / 3600);
            const m = Math.floor((val % 3600) / 60);
            return `${h}h ${m}m`;
          }
          return val.toLocaleString();
        };

        let lbText = `**Current Category:** \`${currentCategory.toUpperCase()}\` | **Timeframe:** \`${currentTimeframe.toUpperCase()}\` (Page ${page + 1}/${Math.max(1, totalPages)})\n\n`;

        if (paginatedData.length === 0) {
          lbText += Translator.t('activity', 'leaderboard.empty', lang) || '*No logs found for this filter.*';
        } else {
          paginatedData.forEach((row, idx) => {
            const rank = page * USERS_PER_PAGE + idx + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
            lbText += `${medal} <@${row.userId}>: \`${formatVal(row.value)}\`\n`;
          });
        }

        // V2 SELECT MENUS & NAVIGATION BUTTONS
        const categorySelect = new StringSelectMenuBuilder()
          .setCustomId('activity_lb_cat')
          .setPlaceholder('Filter by Category')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('💬 Messages').setValue('messages').setDefault(currentCategory === 'messages'),
            new StringSelectMenuOptionBuilder().setLabel('🔊 Voice Time').setValue('voice').setDefault(currentCategory === 'voice'),
            new StringSelectMenuOptionBuilder().setLabel('🖼️ Media Sent').setValue('media').setDefault(currentCategory === 'media'),
            new StringSelectMenuOptionBuilder().setLabel('😀 Emojis Used').setValue('emojis').setDefault(currentCategory === 'emojis'),
            new StringSelectMenuOptionBuilder().setLabel('❤️ Reactions Given').setValue('reactions').setDefault(currentCategory === 'reactions')
          );

        const timeframeSelect = new StringSelectMenuBuilder()
          .setCustomId('activity_lb_time')
          .setPlaceholder('Filter by Timeframe')
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('📅 Today').setValue('daily').setDefault(currentTimeframe === 'daily'),
            new StringSelectMenuOptionBuilder().setLabel('📅 Weekly').setValue('weekly').setDefault(currentTimeframe === 'weekly'),
            new StringSelectMenuOptionBuilder().setLabel('📅 Monthly').setValue('monthly').setDefault(currentTimeframe === 'monthly'),
            new StringSelectMenuOptionBuilder().setLabel('♾️ All-Time').setValue('all').setDefault(currentTimeframe === 'all')
          );

        const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('activity_lb_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId('activity_lb_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
        );

        return ContainerService.create({
          title: Translator.t('activity', 'leaderboard.title', lang) || '🏆 Activity Leaderboard',
          description: lbText,
          color: '#7367F0',
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect),
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(timeframeSelect),
            btnRow
          ],
          footer: true,
          interaction
        });
      };

      const embed = await generateLbContainer();
      await replyV2(interaction, embed);
      const response = await interaction.fetchReply();

      // Collect Interactions
      const collector = response.createMessageComponentCollector({
        time: flamebornConfig.behavior.collectorTimeout || 60000
      });

      collector.on('collect', async (i: any) => {
        if (i.user.id !== interaction.user.id) {
          return await replyV2(i, ContainerService.simple('❌ You cannot interact with this menu!', { interaction: i }));
        }

        try { await i.deferUpdate(); } catch (e) { return; }

        if (i.isStringSelectMenu()) {
          if (i.customId === 'activity_lb_cat') {
            currentCategory = i.values[0];
          } else if (i.customId === 'activity_lb_time') {
            currentTimeframe = i.values[0];
          }
          page = 0; // Reset page on filter changes
        } else if (i.isButton()) {
          if (i.customId === 'activity_lb_prev' && page > 0) page--;
          else if (i.customId === 'activity_lb_next') page++;
        }

        const newEmbed = await generateLbContainer();
        await replyV2(i, newEmbed);
      });

      collector.on('end', async () => {
        // Remove filters on timeout
        const disabledEmbed = await generateLbContainer();
        await replyV2(interaction, { ...disabledEmbed, components: [] }).catch(() => {});
      });
    }
  }
};
