import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import { prisma } from '../../../../database/client';
import { tenantStorage } from '../../../../utils/context';
import { BirthdayService } from '../../services/BirthdayService';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('test')
       .setDescription('🧪 Test the birthday announcement card (Admin Only).'),
       
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return replyV2(interaction, ContainerService.simple('❌ You need `Manage Guild` permissions to use this command.'), true);
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const setting = await prisma.birthday_settings.findUnique({
      where: { 
        guildId_tenantId: {
          guildId: context.guildId,
          tenantId: context.tenantId
        }
      }
    });

    if (!setting) {
      return replyV2(interaction, ContainerService.simple('❌ Birthday settings not found for this server. Run `/birthday setting` first.'), true);
    }

    // Immediately generate a card for the user for testing purposes
    const age = 21; // Dummy age for test
    const card = await BirthdayService.generateBirthdayCard(interaction.client, context.guildId, interaction.user.id, setting, age);

    if (!card) {
      return replyV2(interaction, ContainerService.simple('❌ Failed to generate birthday card. Check logs.'), true);
    }

    const wishBtn = new ButtonBuilder()
      .setCustomId(`birthday_wish_${interaction.user.id}`)
      .setLabel('🥳 Send a Wish')
      .setStyle(ButtonStyle.Primary);

    const giftBtn = new ButtonBuilder()
      .setCustomId(`birthday_claim_${interaction.user.id}_${setting.bonusEmbers}`)
      .setLabel(`🎁 Claim Gift`)
      .setStyle(ButtonStyle.Success);

    // 1. Image and Message (from generator)
    // 2. Separator
    card.builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // 3. Ping Role (Under message)
    const pingMention = setting.pingRoleId ? `<@&${setting.pingRoleId}>` : '';
    if (pingMention) {
       card.builder.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Wake up! ${pingMention}`));
      card.builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 4. Buttons
    const row = new ActionRowBuilder<any>().addComponents(wishBtn, giftBtn);
    card.builder.addActionRowComponents(row);

    // 5. Branding (Bottom)
    card.builder
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`© ${interaction.client.user?.username} Celebration Moment`));

    // Prepend preview header inside the container
    (card.builder as any).spliceComponents(0, 0,
      new TextDisplayBuilder().setContent('-# 🧪 Birthday Studio — Live Preview'),
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    await interaction.editReply({
      components: [card.builder],
      files: card.files,
      flags: MessageFlags.IsComponentsV2
    } as any);
  }
};
