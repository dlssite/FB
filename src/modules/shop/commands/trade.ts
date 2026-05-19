import { SlashCommandBuilder, GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService, replyV2 } from '../../../utils/container';

export default {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('🤝 Initiate a secure trade with another player.')
    .addUserOption(opt => opt.setName('user').setDescription('The player you want to trade with').setRequired(true)),

  async execute(interaction: any) {
    const { guild, member, options } = interaction;
    const targetUser = options.getMember('user') as GuildMember;

    if (!targetUser) return await replyV2(interaction, ContainerService.simple('❌ User not found in this server.'));
    if (targetUser.id === member.id) return await replyV2(interaction, ContainerService.simple('❌ You cannot trade with yourself.'));
    if (targetUser.user.bot) return await replyV2(interaction, ContainerService.simple('❌ You cannot trade with bots.'));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_accept_${member.id}_${targetUser.id}`)
        .setLabel('Accept Trade Request')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`trade_decline_${member.id}_${targetUser.id}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger)
    );

    return await replyV2(interaction, ContainerService.create({
      title: '🤝 Trade Request',
      description: `${member} has invited you to a secure trade, ${targetUser}.\n\nClick the button below to open the trading interface.`,
      color: '#7367F0',
      components: [row],
      interaction
    }));
  }
};
