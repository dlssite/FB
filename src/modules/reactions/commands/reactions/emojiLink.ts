import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ChannelType, MessageFlags } from 'discord.js';
import { Logger } from '../../../../utils/logger';
import { RoutingService } from '../../../../services/RoutingService';
import { AddonService } from '../../../../services/AddonService';
import { ReactionRepository } from '../../database/ReactionRepository';
import { RoleAssignmentService } from '../../services/RoleAssignmentService';
import { EmbedService } from '../../../../utils/embed';
import { replyV2, ContainerService } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('link')
      .setDescription('Link an emoji reaction to a role')
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
        opt.setName('emoji').setDescription('Emoji to link').setRequired(true)
      )
      .addRoleOption(opt =>
        opt.setName('role').setDescription('Role to assign on reaction').setRequired(true)
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
    const role = interaction.options.getRole('role', true);

    try {
      const channel = interaction.options.getChannel('channel', true);

      // Ensure channel has messages property (TextChannel, NewsChannel, etc)
      if (!('messages' in channel)) {
        throw new Error('Channel must be a text channel');
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) throw new Error('Message not found in that channel');

      // Validate role
      const { valid } = await RoleAssignmentService.validateRoles(interaction.guild, [role.id]);
      if (!valid.includes(role.id)) {
        throw new Error('Invalid role or bot cannot manage it');
      }

      // Link emoji to role
      await ReactionRepository.linkEmoji({
        guildId,
        tenantId,
        channelId: channel.id,
        messageId,
        emoji,
        roleIds: [role.id]
      });

      const container = ContainerService.create({
        title: '✅ Emoji Linked',
        description: `${emoji} on [message](${message.url}) now grants <@&${role.id}>`,
        color: '#28C76F',
        footer: true
      });

      return await replyV2(interaction, container);
    } catch (err: any) {
      Logger.error('Emoji Link Error', err);
      const errorContainer = EmbedService.containerError(
        err.message || 'Failed to link emoji',
        'EMOJI_LINK_ERR'
      );
      return await replyV2(interaction, errorContainer);
    }
  }
};
