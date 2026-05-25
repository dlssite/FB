import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { ProfileService } from '../../services/ProfileService';
import { ProfileRepository } from '../../database/ProfileRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('view')
       .setDescription('👤 View a universal citizen profile.')
       .addUserOption(opt => opt.setName('target').setDescription('The citizen whose profile you want to check').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';
    const tenantId = context.tenantId;
    const guildId = interaction.guildId || '';

    const targetUser = interaction.options.getUser('target') || interaction.user;
    const isOwner = targetUser.id === interaction.user.id;
    const isAdmin = (interaction.member?.permissions as PermissionsBitField)?.has(PermissionsBitField.Flags.Administrator) || false;

    // Fetch Profile DB Record
    const profile = await ProfileRepository.getProfile(tenantId, targetUser.id);

    // Check Privacy Shield
    if (profile.privacyMode && !isOwner && !isAdmin) {
      const privateContainer = ContainerService.create({
        title: Translator.t('profile', 'view.private_title', lang),
        description: Translator.t('profile', 'view.private_desc', lang),
        color: '#FF5722',
        thumbnail: targetUser.displayAvatarURL(),
        interaction
      });
      return await replyV2(interaction, privateContainer);
    }

    // Gather Identity Info
    const targetMember = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
    const nickname = targetMember?.nickname || targetUser.username;
    const title = profile.adminTitle || flamebornConfig.profile.defaultTitle;
    const bio = profile.bio || Translator.t('profile', 'view.no_bio', lang);

    // Gather Dynamic Provider Fields
    const providerFields = await ProfileService.getProfileContainerFields(tenantId, guildId, targetUser.id);

    const dropdown = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`profile_section_select_${targetUser.id}`)
        .setPlaceholder('Select Profile Section...')
        .addOptions([
          { label: 'All Sections', value: 'all', emoji: '🌟', description: 'Display all citizen statistics' },
          { label: 'Economy & Vault', value: 'economy', emoji: '💠', description: 'Embers, Vault, and Portfolio' },
          { label: 'Vault & Personal Inventory', value: 'inventory', emoji: '🎒', description: 'Shop items and backpack storage' },
          { label: 'Progression & Rank', value: 'leveling', emoji: '🧬', description: 'Level, Guild Rank, and XP' },
          { label: 'Daily Streaks', value: 'streaks', emoji: '🔥', description: 'Activity streaks and freezes' },
          { label: 'Faction Allegiance', value: 'faction', emoji: '🛡️', description: 'Faction rank and motto' },
          { label: 'Astrology & Birthday', value: 'birthday', emoji: '🎂', description: 'Zodiac sign and birth date' },
          { label: 'Social Resonance', value: 'social', emoji: '💝', description: 'Marriage, friends, and family' },
          { label: 'Geographic & Colonial', value: 'territory', emoji: '🌍', description: 'Current nation and buildings' },
          { label: 'Recruitment & Influence', value: 'invite', emoji: '📈', description: 'Real invites and join stats' },
          { label: 'Symphony Listening', value: 'music', emoji: '🎶', description: 'Listen time and requested tracks' },
          { label: 'Booster Ecosystem', value: 'booster', emoji: '🚀', description: 'Booster tier and custom roles' }
        ])
    );

    // Assemble V2 Container
    const response = ContainerService.create({
      layout: 'profile',
      title: `About ${nickname}`,
      description: `**${title}**\n${bio}`,
      image: profile.customBanner || flamebornConfig.assets.profileBanner,
      thumbnail: targetUser.displayAvatarURL(),
      color: profile.customColor || flamebornConfig.branding.color,
      fields: providerFields,
      components: [dropdown],
      footer: true,
      interaction
    });

    await replyV2(interaction, response);
  }
};
