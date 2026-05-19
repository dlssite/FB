import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType
} from 'discord.js';
import { ContainerService, replyV2 } from '../../../utils/container';
import { ActivityService } from '../services/ActivityService';
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
                { name: 'Channel Hotspots', value: 'hotspots' }
              )
         )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
         .setDescription('🏆 View interactive active leaderboards.')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
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

    // ==========================================
    // 2. SUBCOMMAND: SERVER TELEMETRY
    // ==========================================
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
          return i.reply({ content: '❌ You cannot interact with this menu!', ephemeral: true });
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
