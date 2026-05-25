import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('steal')
      .setDescription('Steals emojis, stickers, or attachments from a message or reply')
      .addStringOption(opt => opt.setName('source').setDescription('The emoji/sticker or URL (optional if replying to a message)'))
      .addStringOption(opt => opt.setName('name').setDescription('New name (only applies if stealing a single item)')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    let rawSource = interaction.options.getString('source');
    const customName = interaction.options.getString('name');
    const guild = interaction.guild;
    if (!guild) return;

    const stealables: { url: string; name: string; type: 'emoji' | 'sticker' | 'image' }[] = [];

    // 1. Resolve source (Input or Reply)
    if (!rawSource && (interaction as any).message?.reference?.messageId) {
      try {
        const refMsg = await interaction.channel?.messages.fetch((interaction as any).message.reference.messageId);
        if (refMsg) {
          // Collect emojis
          const emojiRegex = /<(a?):([a-zA-Z0-9_]+):([0-9]+)>/g;
          let match;
          while ((match = emojiRegex.exec(refMsg.content)) !== null) {
            stealables.push({
              url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}`,
              name: match[2],
              type: 'emoji'
            });
          }
          // Collect stickers
          refMsg.stickers.forEach(s => stealables.push({ url: s.url, name: s.name, type: 'sticker' }));
          // Collect attachments
          refMsg.attachments.forEach(a => {
            if (a.contentType?.startsWith('image/')) stealables.push({ url: a.url, name: a.name.split('.')[0], type: 'image' });
          });
        }
      } catch (err) {
        return await replyV2(interaction, ContainerService.simple('❌ Failed to fetch the replied message.', { color: '#EA5455' }));
      }
    } else if (rawSource) {
      const emojiRegex = /<(a?):([a-zA-Z0-9_]+):([0-9]+)>/;
      const match = emojiRegex.exec(rawSource);
      if (match) {
        stealables.push({
          url: `https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? 'gif' : 'png'}`,
          name: customName || match[2],
          type: 'emoji'
        });
      } else if (rawSource.startsWith('http')) {
        stealables.push({ url: rawSource, name: customName || 'stolen_item', type: 'image' });
      }
    }

    if (stealables.length === 0) {
      return await replyV2(interaction, ContainerService.simple('❌ No valid emojis, stickers, or images found to steal.', { color: '#EA5455' }));
    }

    // 2. Filter Duplicates & Execute
    const results: string[] = [];
    const existingEmojis = await guild.emojis.fetch();

    for (const item of stealables) {
      // 1. Duplication check
      if (item.type === 'emoji' && existingEmojis.some(e => e.name === item.name)) {
        results.push(`⚠️ Skipping **${item.name}** (Emoji name exists)`);
        continue;
      }

      try {
        if (item.type === 'sticker') {
          // Stickers have different creation requirements
          if (item.url.endsWith('.json')) {
            results.push(`⚠️ Skipping **${item.name}** (Lottie stickers cannot be stolen)`);
            continue;
          }
          const created = await guild.stickers.create({
            file: item.url,
            name: item.name,
            tags: item.name, // Tags are required for stickers
            description: `Stolen by ${interaction.user.tag}`
          });
          results.push(`✅ Stolen Sticker **${item.name}**`);
        } else {
          // Emojis (images/gifs)
          const created = await guild.emojis.create({ attachment: item.url, name: item.name });
          results.push(`✅ Stolen Emoji **${item.name}** (${created.toString()})`);
        }
      } catch (err: any) {
        console.error(`[StealError] ${item.name}:`, err);
        results.push(`❌ Failed to steal **${item.name}**: ${err.message}`);
      }
    }

    await interaction.editReply({
      content: '',
      ...ContainerService.create({
        title: '📥 Emoji Stealer Results',
        description: results.join('\n'),
        color: results.some(r => r.startsWith('✅')) ? '#28C76F' : '#EA5455',
        footer: true,
        interaction
      })
    });
  },
};
