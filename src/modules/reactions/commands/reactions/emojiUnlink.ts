import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ChannelType, MessageFlags } from 'discord.js';
import { Logger } from '../../../../utils/logger';
import { RoutingService } from '../../../../services/RoutingService';
import { AddonService } from '../../../../services/AddonService';
import { ReactionRepository } from '../../database/ReactionRepository';
import { EmbedService } from '../../../../utils/embed';
import { replyV2, ContainerService } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('unlink')
      .setDescription('Remove an emoji reaction link')
      .addStringOption(opt =>
        opt.setName('message_id').setDescription('Message ID').setRequired(true)
      )
      .addChannelOption(opt =>
        opt
          .setName('channel')
          .setDescription('Channel containing the message')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('emoji').setDescription('Emoji to unlink').setRequired(true)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const guildId = interaction.guild.id;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'reactions');

    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'reactions');
    if (!isEnabled) {
      const errorContainer = EmbedService.containerError('Reactions module is not enabled', 'ADDON_DISABLED');
      return await replyV2(interaction, errorContainer);
    }

    const messageId = interaction.options.getString('message_id', true);
    const emoji = interaction.options.getString('emoji', true);

    try {
      const channel = interaction.options.getChannel('channel', true);

      await ReactionRepository.unlinkEmoji(guildId, tenantId, messageId, emoji);

      const container = ContainerService.create({
        title: '✅ Emoji Unlinked',
        description: `${emoji} is no longer linked on that message`,
        color: '#28C76F',
        footer: true
      });

      return await replyV2(interaction, container);
    } catch (err: any) {
      Logger.error('Emoji Unlink Error', err);
      const errorContainer = EmbedService.containerError(
        err.message || 'Failed to unlink emoji',
        'EMOJI_UNLINK_ERR'
      );
      return await replyV2(interaction, errorContainer);
    }
  }
};
