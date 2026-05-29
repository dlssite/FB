import { 
  ButtonInteraction, 
  StringSelectMenuInteraction, 
  ModalSubmitInteraction,
  MessageFlags,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events
} from 'discord.js';
import { VerificationRepository } from '../database/VerificationRepository';
import { VerificationService } from '../services/VerificationService';
import { tenantStorage } from '../../../utils/context';
import { AddonService } from '../../../services/AddonService';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
    
    const guildId = interaction.guildId;
    if (!guildId) return;

    // Filter to only verification interactions early
    const customId = interaction.customId;
    const isVerificationInteraction = (
      customId.startsWith('verify_start_') ||
      customId.startsWith('verify_accept_rules_') ||
      customId.startsWith('verify_math_modal_trigger_') ||
      customId.startsWith('verify_captcha_color_') ||
      customId.startsWith('verify_role_select_') ||
      customId === 'verify_finish_roles' ||
      customId.startsWith('verify_math_modal_submit_') ||
      customId === 'verify_access_code_modal_trigger' ||
      customId === 'verify_access_code_modal_submit'
    );
    if (!isVerificationInteraction) return;

    // If this interaction should open a modal, do it immediately (before any awaits)
    const isModalTrigger = customId.startsWith('verify_math_modal_trigger_') || customId === 'verify_access_code_modal_trigger';
    if (isModalTrigger) {
      // Handle math captcha modal trigger
      if (customId.startsWith('verify_math_modal_trigger_')) {
        const answer = customId.replace('verify_math_modal_trigger_', '');
        const modal = new ModalBuilder()
          .setCustomId(`verify_math_modal_submit_${answer}`)
          .setTitle('Math Captcha');

        const input = new TextInputBuilder()
          .setCustomId('captcha_answer')
          .setLabel('Solve the math problem')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        if (interaction.isButton()) await (interaction as ButtonInteraction).showModal(modal).catch(() => {});
        return;
      }

      // Handle access code modal trigger
      if (customId === 'verify_access_code_modal_trigger') {
        const modal = new ModalBuilder()
          .setCustomId(`verify_access_code_modal_submit`)
          .setTitle('Access Code');

        const input = new TextInputBuilder()
          .setCustomId('access_code_input')
          .setLabel('Enter the server access code')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        if (interaction.isButton()) await (interaction as ButtonInteraction).showModal(modal).catch(() => {});
        return;
      }
    }

    // Defer IMMEDIATELY before any other async work to beat Discord's 3s window
    if (!isModalTrigger) {
      if (customId.startsWith('verify_start_')) {
        await (interaction as ButtonInteraction).deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await (interaction as ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction).deferUpdate().catch(() => {});
      }
    }

    const { RoutingService } = await import('../../../services/RoutingService');
    const tenantId = await RoutingService.resolveTenantId(guildId, 'verification');
    
    // Gatekeeper Check: Is Verification enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'verification');
    if (!isEnabled) return;

    await tenantStorage.run({ tenantId, guildId, lang: 'en' }, async () => {
      const customId = interaction.customId;

      // --- START WIZARD ---
      if (customId.startsWith('verify_start_')) {
        await VerificationService.startWizard(interaction as ButtonInteraction, tenantId, guildId);
      }

      // --- STEP 1: ACCEPT RULES ---
      else if (customId.startsWith('verify_accept_rules_')) {
        const settings = await VerificationRepository.getSettings(tenantId, guildId);
        await VerificationService.sendCaptchaStep(interaction, settings);
      }

      // Modal triggers are handled earlier (shown immediately to avoid token expiry)

      else if (customId.startsWith('verify_captcha_color_')) {
        const status = customId.replace('verify_captcha_color_', '');
        if (status === 'fail') {
          return await interaction.followUp({ content: '❌ Incorrect. Try again!', flags: MessageFlags.Ephemeral });
        }
        await VerificationService.completeVerification(interaction, tenantId, guildId);
      }

      // --- STEP 3: ROLE SELECTION ---
      else if (customId.startsWith('verify_role_select_')) {
        const groupIdStr = customId.replace('verify_role_select_', '');
        const groupId = parseInt(groupIdStr);
        const selectedRoles = (interaction as StringSelectMenuInteraction).values;
        const member = interaction.member as GuildMember;

        const group = await VerificationRepository.getGroupById(groupId);
        if (!group) return;

        // Remove current roles from this group
        const rolesToRemove = group.roles.map(r => r.roleId);
        await member.roles.remove(rolesToRemove).catch(() => {});

        // Add selected roles
        await member.roles.add(selectedRoles).catch(() => {});

        // Sync header roles
        await VerificationService.syncHeaderRoles(member, tenantId, guildId);
      }

      // --- STEP 4: FINISH ---
      else if (customId === 'verify_finish_roles') {
        await VerificationService.completeVerification(interaction, tenantId, guildId);
      }

      else if (interaction.isModalSubmit() && customId.startsWith('verify_math_modal_submit_')) {
        const expectedAnswer = customId.replace('verify_math_modal_submit_', '');
        const userAnswer = interaction.fields.getTextInputValue('captcha_answer');

        if (userAnswer !== expectedAnswer) {
          return await interaction.followUp({ content: '❌ Incorrect answer. Try again!', flags: MessageFlags.Ephemeral });
        }

        await VerificationService.completeVerification(interaction, tenantId, guildId);
      }

      // --- MODAL SUBMIT (ACCESS CODE) ---
      else if (interaction.isModalSubmit() && customId === 'verify_access_code_modal_submit') {
        const userAnswer = interaction.fields.getTextInputValue('access_code_input');
        const validCodes = await VerificationRepository.getAccessCodes(tenantId, guildId);

        if (!validCodes.some(c => c.code === userAnswer)) {
          return await interaction.followUp({ content: '❌ Incorrect access code. Try again!', flags: MessageFlags.Ephemeral });
        }

        await VerificationService.completeVerification(interaction, tenantId, guildId);
      }
    });
  }
};
