import { 
  Client, 
  User, 
  GuildMember, 
  ButtonInteraction, 
  StringSelectMenuInteraction,
  ContainerBuilder, 
  TextDisplayBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { VerificationRepository } from '../database/VerificationRepository';
import { CaptchaService } from './CaptchaService';
import { flamebornConfig } from '../../../config/flameborn.config';
import { replyV2 } from '../../../utils/container';

export class VerificationService {
  /**
   * Starts the verification wizard for a user
   */
  static async startWizard(interaction: ButtonInteraction, tenantId: string, guildId: string) {
    const settings = await VerificationRepository.getSettings(tenantId, guildId);
    if (!settings || !settings.enabled) {
      return await interaction.editReply({ content: '❌ Verification is not configured.' });
    }

    if (settings.panicMode) {
      return await interaction.editReply({ 
        content: '🔒 Verification is currently locked due to maintenance or security reasons.'
      });
    }

    // Check account age
    const accountAgeDays = Math.floor((Date.now() - interaction.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    if (accountAgeDays < settings.minAccountAgeDays) {
      return await interaction.editReply({ 
        content: `❌ Your account is too new. (Required: ${settings.minAccountAgeDays} days, You: ${accountAgeDays} days)`
      });
    }

    // Step 1: Rules
    await this.sendRulesStep(interaction, settings);
  }

  static async sendRulesStep(interaction: any, settings: any) {
    const { ContainerService } = await import('../../../utils/container');
    
    const acceptBtn = new ButtonBuilder()
      .setCustomId(`verify_accept_rules_${settings.guildId}`)
      .setLabel('Accept Rules')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptBtn);

    const containerData = ContainerService.create({
      image: flamebornConfig.assets.verificationBanner || undefined,
      description: `# 📜 Server Rules\n${settings.rulesContent || 'No rules defined.'}`,
      components: [row]
    });
    
    await replyV2(interaction, containerData);
  }

  static async sendCaptchaStep(interaction: any, settings: any) {
    let rows: ActionRowBuilder<any>[] = [];
    let captchaQuestion = '';

    if (settings.captchaType === 'math') {
      const captcha = CaptchaService.generateMathCaptcha();
      captchaQuestion = `# 🧠 Security Check\nTo verify you are human, please solve this: **${captcha.question}**`;
      
      const solveBtn = new ButtonBuilder()
        .setCustomId(`verify_math_modal_trigger_${captcha.answer}`)
        .setLabel('Solve Math')
        .setStyle(ButtonStyle.Primary);
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(solveBtn));
    } else if (settings.captchaType === 'color') {
      const captcha = CaptchaService.generateColorCaptcha();
      captchaQuestion = `# 🎨 Security Check\n${captcha.question}`;
      
      const row = new ActionRowBuilder<ButtonBuilder>();
      captcha.options.forEach(opt => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`verify_captcha_color_${opt.value === captcha.answer ? 'pass' : 'fail'}`)
            .setLabel(opt.name)
            .setEmoji(opt.emoji)
            .setStyle(ButtonStyle.Secondary)
        );
      });
      rows.push(row);
    } else if (settings.captchaType === 'access_code') {
      captchaQuestion = `# 🔑 Security Check\nThis server requires an access code to enter.`;
      
      const codeBtn = new ButtonBuilder()
        .setCustomId(`verify_access_code_modal_trigger`)
        .setLabel('Enter Code')
        .setStyle(ButtonStyle.Primary);
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(codeBtn));
    } else {
      // Skip to roles if no captcha
      return await this.sendRolesStep(interaction, settings.tenantId, settings.guildId);
    }

    const { ContainerService } = await import('../../../utils/container');
    const containerData = ContainerService.create({
      description: captchaQuestion,
      components: rows
    });

    await replyV2(interaction, containerData);
  }

  static async sendRolesStep(interaction: any, tenantId: string, guildId: string) {
    const groups = await VerificationRepository.getGroups(tenantId, guildId);
    if (groups.length === 0) {
      return await this.completeVerification(interaction, tenantId, guildId);
    }

    const rows: ActionRowBuilder<any>[] = [];
    
    for (const group of groups) {
      if (group.roles.length === 0) continue;

      const select = new StringSelectMenuBuilder()
        .setCustomId(`verify_role_select_${group.id}`)
        .setPlaceholder(group.name)
        .setMinValues(group.minSelect)
        .setMaxValues(group.maxSelect);

      group.roles.forEach(role => {
        select.addOptions({
          label: role.label,
          value: role.roleId,
          description: role.description || undefined,
          emoji: role.emoji || undefined,
        });
      });

      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    }

    const finishBtn = new ButtonBuilder()
      .setCustomId(`verify_finish_roles`)
      .setLabel('Complete Onboarding')
      .setStyle(ButtonStyle.Success);

    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(finishBtn));

    const { ContainerService } = await import('../../../utils/container');
    const containerData = ContainerService.create({
      title: 'Role Selection',
      description: 'Customize your profile before entering the server!',
      components: rows
    });

    await replyV2(interaction, containerData);
  }

  static async completeVerification(interaction: any, tenantId: string, guildId: string) {
    const settings = await VerificationRepository.getSettings(tenantId, guildId);
    const member = interaction.member as GuildMember;

    // Restore Backup Roles
    const backupRoles = await VerificationRepository.getBackup(tenantId, guildId, member.id);
    if (backupRoles && backupRoles.length > 0) {
      await member.roles.add(backupRoles).catch(() => {});
      await VerificationRepository.deleteBackup(tenantId, guildId, member.id);
    }

    // Grant Verified Role
    if (settings.verifiedRoleId) {
      await member.roles.add(settings.verifiedRoleId).catch(() => {});
    }

    // Remove Unverified Role
    if (settings.unverifiedRoleId) {
      await member.roles.remove(settings.unverifiedRoleId).catch(() => {});
    }

    const { ContainerService } = await import('../../../utils/container');
    const containerData = ContainerService.create({
      title: 'Verification Complete!',
      description: 'Welcome to the server! Your original roles have been restored and you now have full access.',
      color: '#00FF00'
    });

    await replyV2(interaction, containerData);
  }

  /**
   * Seizes all roles from a user and stores them in backup, giving them the unverified role.
   */
  static async seizeRoles(member: GuildMember, tenantId: string, guildId: string) {
    const settings = await VerificationRepository.getSettings(tenantId, guildId);
    if (!settings || !settings.unverifiedRoleId) return;

    // Filter out @everyone and the unverified role itself
    const currentRoles = member.roles.cache
      .filter(r => r.id !== guildId && r.id !== settings.unverifiedRoleId)
      .map(r => r.id);

    // Only backup if they actually have roles to lose
    if (currentRoles.length > 0) {
      await VerificationRepository.saveBackup(tenantId, guildId, member.id, currentRoles);
    }
    
    // Set to only unverified role
    await member.roles.set([settings.unverifiedRoleId]).catch(() => {});
  }

  /**
   * Logic for Auto-Header roles
   */
  static async syncHeaderRoles(member: GuildMember, tenantId: string, guildId: string) {
    const groups = await VerificationRepository.getGroups(tenantId, guildId);
    
    for (const group of groups) {
      if (!group.headerRoleId) continue;

      const hasAnyRoleInGroup = group.roles.some(r => member.roles.cache.has(r.roleId));
      const hasHeader = member.roles.cache.has(group.headerRoleId);

      if (hasAnyRoleInGroup && !hasHeader) {
        await member.roles.add(group.headerRoleId).catch(() => {});
      } else if (!hasAnyRoleInGroup && hasHeader) {
        await member.roles.remove(group.headerRoleId).catch(() => {});
      }
    }
  }

  private static resolveColor(color: string): number {
    return parseInt(color.replace('#', ''), 16);
  }
}
