import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
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

    const { ContainerService } = await import('../../../../utils/container');
    const containerData = ContainerService.create({
      image: flamebornConfig.assets.verificationBanner || undefined,
      description: `# 🛡️ Security Verification\nWelcome! To gain access to the rest of the server, please click the button below to start the verification and onboarding process.`,
      components: [row]
    });

    await (interaction.channel as any)?.send(containerData);
    
    await interaction.editReply({ content: '✅ Verification prompt sent.' });
  }
};
