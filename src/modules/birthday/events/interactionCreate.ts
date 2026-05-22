import { Interaction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalActionRowComponentBuilder, MessageFlags, ButtonBuilder, ButtonStyle, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { prisma } from '../../../database/client';
import { ContainerService, replyV2 } from '../../../utils/container';
import { tenantStorage } from '../../../utils/context';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: 'interactionCreate',
  async execute(interaction: Interaction) {
    let context = tenantStorage.getStore();
    
    // Fallback context resolution for buttons/modals
    if (!context && interaction.guildId) {
      const tenantId = await RoutingService.resolveTenantId(interaction.guildId, 'birthday');
      
      // Gatekeeper Check: Is Birthday enabled?
      const isEnabled = await AddonService.isEnabled(tenantId, interaction.guildId, 'birthday');
      if (!isEnabled) return;
      
      context = { tenantId, guildId: interaction.guildId, lang: 'en' };
    }

    if (!context) return;

    // 1. Handle "Send a Wish" Button
    if (interaction.isButton() && interaction.customId.startsWith('birthday_wish_')) {
      const targetUserId = interaction.customId.split('_')[2];
      
      // Check if they already sent a wish this year
      const currentYear = new Date().getFullYear();
      const existingWish = await prisma.birthday_wishes.findFirst({
        where: {
          tenantId: context.tenantId,
          recipientId: targetUserId,
          senderId: interaction.user.id,
          year: currentYear
        }
      });

      if (existingWish) {
        return interaction.reply({ 
          content: '❌ You have already sent a wish to this person today!', 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`birthday_modal_${targetUserId}`)
        .setTitle('🥳 Send a Birthday Wish');

      const wishInput = new TextInputBuilder()
        .setCustomId('wish_text')
        .setLabel("What's your message?")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Happy birthday! Hope you have an amazing day! 🎉')
        .setMaxLength(200)
        .setRequired(true);

      const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(wishInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    // 2. Handle Modal Submission
    if (interaction.isModalSubmit() && interaction.customId.startsWith('birthday_modal_')) {
      // Defer IMMEDIATELY before any async work to prevent Unknown Interaction (10062)
      await interaction.deferReply({ ephemeral: true, flags: MessageFlags.IsComponentsV2 } as any);

      const targetUserId = interaction.customId.split('_')[2];
      const message = interaction.fields.getTextInputValue('wish_text');
      const currentYear = new Date().getFullYear();

      // Resolve context now (after defer — we have time)
      if (!context && interaction.guildId) {
        const tenantId = await RoutingService.resolveTenantId(interaction.guildId, 'birthday');
        context = { tenantId, guildId: interaction.guildId, lang: 'en' };
      }

      if (!context) {
        return replyV2(interaction, ContainerService.simple('❌ Could not resolve server context. Please try again.', { color: 'Red' }), true);
      }

      const existingWish = await prisma.birthday_wishes.findFirst({
        where: {
          tenantId: context.tenantId,
          recipientId: targetUserId,
          senderId: interaction.user.id,
          year: currentYear
        }
      });

      if (existingWish) {
        return replyV2(interaction, ContainerService.simple('❌ You have already sent a wish to this person today!', { color: 'Red' }), true);
      }

      await prisma.birthday_wishes.create({
        data: {
          tenantId: context.tenantId,
          guildId: context.guildId,
          recipientId: targetUserId,
          senderId: interaction.user.id,
          year: currentYear,
          message: message
        }
      });

      await replyV2(interaction, ContainerService.simple(`💖 Your wish has been sent to <@${targetUserId}>!`, { color: '#FFB600' }), true);
    }

    // 3. Handle "Claim Embers" Button
    if (interaction.isButton() && interaction.customId.startsWith('birthday_claim_')) {
      const parts = interaction.customId.split('_');
      const targetUserId = parts[2];
      const embers = parseInt(parts[3]);

      // Only the birthday person can claim!
      if (interaction.user.id !== targetUserId) {
        return interaction.reply({ 
          content: "❌ This gift is only for the birthday person!", 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      await interaction.deferUpdate();

      // Grant Embers
      await prisma.flameborn_users.upsert({
        where: { 
          userId_tenantId: {
            userId: interaction.user.id,
            tenantId: context.tenantId
          }
        },
        update: { embers: { increment: BigInt(embers) } },
        create: {
          userId: interaction.user.id,
          tenantId: context.tenantId,
          embers: BigInt(embers)
        }
      });

      // Update the button to "Gifted" and disable it
      const wishBtn = new ButtonBuilder()
        .setCustomId(`birthday_wish_${targetUserId}`)
        .setLabel('🥳 Send a Wish')
        .setStyle(ButtonStyle.Primary);

      const giftBtn = new ButtonBuilder()
        .setCustomId(`birthday_info_gift`)
        .setLabel(`🎁 Gifted ${embers} Embers`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const row = new ActionRowBuilder<any>().addComponents(wishBtn, giftBtn);

      // Find the component and update it
      // Since this is V2, components[0] is the container.
      // But wait, interaction.message.components is an array of ActionRows.
      // In V2, interaction.message.components[0] is Type 17 (Container).
      // We need to rebuild the container or just update the ActionRow inside it.
      
      // For simplicity in the first version, let's just edit the message with the new components.
      await interaction.editReply({
        components: [
          {
            ...(interaction.message.components[0] as any).toJSON(),
            components: (interaction.message.components[0] as any).components.map((c: any) => {
              if (c.type === 1) { // ActionRow inside Container
                return row.toJSON();
              }
              return c;
            })
          }
        ]
      } as any);
    }

    // 4. Handle "Set Birthday" Confirmation
    if (interaction.isButton() && interaction.customId.startsWith('bday_set_')) {
      const parts = interaction.customId.split('_');
      const action = parts[2]; // 'accept' or 'decline'
      const targetUserId = parts[3];

      // Only the target user can accept/decline
      if (interaction.user.id !== targetUserId) {
        return interaction.reply({ 
          content: "❌ This confirmation is not for you!", 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      await interaction.deferUpdate();

      if (action === 'decline') {
        return replyV2(interaction, ContainerService.simple('❌ Birthday setup cancelled.', { color: '#EA5455' }));
      }

      if (action === 'accept') {
        const day = parseInt(parts[4]);
        const month = parseInt(parts[5]);
        const year = parseInt(parts[6]) || null;

        const existing = await prisma.user_birthdays.findFirst({
          where: { tenantId: context.tenantId, guildId: context.guildId, userId: interaction.user.id }
        });

        if (existing) {
          await prisma.user_birthdays.update({
            where: { id: existing.id },
            data: { day, month, year }
          });
        } else {
          await prisma.user_birthdays.create({
            data: {
              tenantId: context.tenantId,
              guildId: context.guildId,
              userId: interaction.user.id,
              day, month, year
            }
          });
        }

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dateStr = `${monthNames[month - 1]} ${day}${year ? `, ${year}` : ''}`;

        return replyV2(interaction, ContainerService.simple(`✅ Your birthday has been successfully set to **${dateStr}**!`, { color: '#28C76F' }));
      }
    }
  }
};
