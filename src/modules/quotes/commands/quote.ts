import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import { QuoteService, QuoteStyle } from '../services/QuoteService';
import { ContainerService, replyV2 } from '../../../utils/container';

export default {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Create a beautiful image of a quoted message.')
    .addStringOption(opt =>
      opt.setName('style')
        .setDescription('The design style of the quote')
        .addChoices(
          { name: 'Classic (Flameborn)', value: 'classic' },
          { name: 'Discord Native', value: 'discord' },
          { name: 'Spotify Now Playing', value: 'spotify' },
          { name: 'Vintage Polaroid', value: 'polaroid' },
          { name: 'Cyberpunk Neon', value: 'neon' },
          { name: 'Twitter Style', value: 'twitter' },
          { name: 'Reddit Style', value: 'reddit' }
        )
    )
    .addStringOption(opt =>
      opt.setName('message_id')
        .setDescription('The ID of the message to quote (optional if replying)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const shim = interaction as any;
    
    // 1. Resolve Style and Message ID
    // Logic for Prefix vs Slash: 
    // If it's a prefix command shim, getString('style') will pick the first arg.
    let styleInput = interaction.options.getString('style');
    let messageId = interaction.options.getString('message_id');

    // Handle "$q twitter" where twitter is actually the style
    if (styleInput && !['classic', 'twitter', 'reddit', 'discord', 'spotify', 'polaroid', 'neon'].includes(styleInput.toLowerCase())) {
      // If the first arg isn't a valid style, maybe it's a message ID?
      // For now, let's just normalize the style
      messageId = styleInput;
      styleInput = 'classic';
    }

    const style = (styleInput?.toLowerCase() || 'classic') as QuoteStyle;
    let targetMessage: any = null;

    // Check if it's a reply (Priority)
    if (shim.message && shim.message.reference) {
      targetMessage = await shim.message.channel.messages.fetch(shim.message.reference.messageId).catch(() => null);
    }

    // If messageId provided (or the arg was a message ID), fetch it
    if (!targetMessage && messageId) {
      targetMessage = await interaction.channel?.messages.fetch(messageId).catch(() => null);
    }

    // Fallback: If no message found and not a reply
    if (!targetMessage) {
      const errorContainer = ContainerService.create({
        title: 'Quote Failed',
        description: '❌ Please reply to a message with `$q` or provide a valid Message ID.',
        color: '#EA5455',
        footer: true
      });
      return await replyV2(interaction, errorContainer);
    }

    // 2. Generate Canvas Image
    try {
      // ✅ FIX: Removed deferReply() because global handler already defers slash commands.
      // We just use editReply() directly.
      
      const buffer = await QuoteService.generateQuote(targetMessage, style);
      const attachment = new AttachmentBuilder(buffer, { name: 'quote.png' });

      // 3. Send Response
      await interaction.editReply({ files: [attachment] });
      
    } catch (err: any) {
      console.error('[QuoteError]', err);
      // We use editReply here as well to be safe
      return await interaction.editReply({ content: '❌ Failed to generate quote image.' }).catch(() => {});
    }
  }
};
