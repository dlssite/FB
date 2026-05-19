import { Interaction, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } from 'discord.js';
import { ProfileService } from '../services/ProfileService';
import { ProfileRepository } from '../database/ProfileRepository';
import { ContainerService, replyV2 } from '../../../utils/container';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Translator } from '../../../core/Translator';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith('profile_section_select_')) return;

    const targetUserId = interaction.customId.split('_')[3];
    const targetSection = interaction.values[0];
    const tenantId = (interaction as any).tenantId || flamebornConfig.bot?.tenant?.id || 'FBT';
    const guildId = interaction.guildId || '';
    const lang = (interaction as any).lang || 'en';

    await interaction.deferUpdate();

    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) return;

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
      return await replyV2(interaction as any, privateContainer);
    }

    // Gather Identity Info
    const targetMember = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
    const nickname = targetMember?.nickname || targetUser.username;
    const title = profile.adminTitle || flamebornConfig.profile.defaultTitle;
    const bio = profile.bio || Translator.t('profile', 'view.no_bio', lang);

    // Gather Dynamic Provider Fields
    let providerFields = await ProfileService.getProfileContainerFields(tenantId, guildId, targetUser.id);

    if (targetSection !== 'all') {
      providerFields = providerFields.filter(f => f.moduleName === targetSection || f.name.toLowerCase().includes(targetSection));
    }

    const dropdown = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`profile_section_select_${targetUser.id}`)
        .setPlaceholder('Select Profile Section...')
        .addOptions([
          { label: 'All Sections', value: 'all', emoji: '🌟', description: 'Display all citizen statistics', default: targetSection === 'all' },
          { label: 'Economy & Vault', value: 'economy', emoji: '💠', description: 'Embers, Vault, and Portfolio', default: targetSection === 'economy' },
          { label: 'Vault & Personal Inventory', value: 'inventory', emoji: '🎒', description: 'Shop items and backpack storage', default: targetSection === 'inventory' },
          { label: 'Progression & Rank', value: 'leveling', emoji: '🧬', description: 'Level, Guild Rank, and XP', default: targetSection === 'leveling' },
          { label: 'Daily Streaks', value: 'streaks', emoji: '🔥', description: 'Activity streaks and freezes', default: targetSection === 'streaks' },
          { label: 'Faction Allegiance', value: 'faction', emoji: '🛡️', description: 'Faction rank and motto', default: targetSection === 'faction' },
          { label: 'Astrology & Birthday', value: 'birthday', emoji: '🎂', description: 'Zodiac sign and birth date', default: targetSection === 'birthday' },
          { label: 'Social Resonance', value: 'social', emoji: '💝', description: 'Marriage, friends, and family', default: targetSection === 'social' },
          { label: 'Geographic & Colonial', value: 'territory', emoji: '🌍', description: 'Current nation and buildings', default: targetSection === 'territory' },
          { label: 'Recruitment & Influence', value: 'invite', emoji: '📈', description: 'Real invites and join stats', default: targetSection === 'invite' },
          { label: 'Symphony Listening', value: 'music', emoji: '🎶', description: 'Listen time and requested tracks', default: targetSection === 'music' },
          { label: 'Booster Ecosystem', value: 'booster', emoji: '🚀', description: 'Booster tier and custom roles', default: targetSection === 'booster' }
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

    await replyV2(interaction as any, response);
  }
};
