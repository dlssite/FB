import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('send')
       .setDescription('🛡️ Send the verification prompt to this channel'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const verifyBtn = new ButtonBuilder()
      .setCustomId(`verify_start_${context.guildId}`)
      .setLabel('Start Verification')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(verifyBtn);

    const { ContainerService, sendV2, replyV2 } = await import('../../../../utils/container');
    const containerData = ContainerService.create({
      image: flamebornConfig.assets.verificationBanner || undefined,
      description: `# 🛡️ Security Verification\nWelcome! To gain access to the rest of the server, please click the button below to start the verification process.`,
      components: [row]
    });

    await sendV2(interaction.channel as any, containerData).catch(() => {});
    await replyV2(interaction, ContainerService.simple('✅ Verification prompt sent.', { interaction }), true);
  }
};
