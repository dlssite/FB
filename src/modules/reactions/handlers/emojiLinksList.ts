import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Logger } from '../../../utils/logger';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';
import { ReactionRepository } from '../database/ReactionRepository';
import { EmbedService } from '../../../utils/embed';
import { replyV2, ContainerService } from '../../../utils/container';

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const tenantId = await RoutingService.resolveTenantId(guildId, 'reactions');

  const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'reactions');
  if (!isEnabled) {
    const errorContainer = EmbedService.containerError('Reactions module is not enabled', 'ADDON_DISABLED');
    return await replyV2(interaction, errorContainer);
  }

  const messageId = interaction.options.getString('message_id', false);

  try {
    let links;

    if (messageId) {
      // Get emoji links for specific message
      links = await ReactionRepository.getEmojiLinksForMessage(guildId, tenantId, messageId);
    } else {
      // Get all emoji links in guild
      links = await ReactionRepository.getEmojiLinksByGuild(guildId, tenantId);
    }

    if (!links || links.length === 0) {
      const empty = ContainerService.create({
        title: 'No Emoji Links',
        description: 'No emoji reactions have been linked yet',
        color: '#626769',
        footer: true
      });
      return await replyV2(interaction, empty);
    }

    // Group by message if showing multiple
    const grouped: Record<string, any[]> = {};
    for (const link of links) {
      const key = link.messageId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(link);
    }

    // Build embed with emoji links
    const embedFields: Array<{ name: string; value: string; inline: boolean }> = [];
    let fieldCount = 0;
    for (const [msgId, msgLinks] of Object.entries(grouped)) {
      if (fieldCount >= 24) break; // Discord limit

      const emojiField = msgLinks
        .map(link => `${link.emoji} → <@&${link.roleIds[0]}>`)
        .join('\n');

      embedFields.push({
        name: `Message \`${msgId.slice(0, 8)}\``,
        value: emojiField || 'No links',
        inline: false
      });

      fieldCount++;
    }

    const container = ContainerService.create({
      title: '📌 Emoji Reaction Links',
      description: 'Active emoji→role mappings',
      fields: embedFields,
      color: '#2196F3',
      footer: true
    });
    return await replyV2(interaction, container);
  } catch (err: any) {
    Logger.error('Emoji Links List Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to fetch emoji links',
      'EMOJI_LINKS_LIST_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
