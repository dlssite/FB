import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { MusicRepository } from '../../database/MusicRepository';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('setup')
       .setDescription('⚙️ Configure Symphony settings (DJ Role, Channel, Jukebox Lock).')
       .addRoleOption(opt => opt.setName('dj-role').setDescription('The role required to control music'))
       .addChannelOption(opt => opt.setName('channel').setDescription('The only channel where music commands can be used'))
       .addBooleanOption(opt => opt.setName('lock-jukebox').setDescription('Lock the queue for premium Jukebox Token holders only')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Permission Denied',
        description: 'You need `Manage Server` permissions to use this command.',
        color: '#E74C3C',
        interaction
      }));
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const djRole = interaction.options.getRole('dj-role');
    const channel = interaction.options.getChannel('channel');
    const lockJukebox = interaction.options.getBoolean('lock-jukebox');

    const updateData: any = {};
    if (djRole) updateData.djRoleId = djRole.id;
    if (channel) updateData.channelId = channel.id;
    if (lockJukebox !== null) updateData.isLocked = lockJukebox;

    await MusicRepository.updateSettings(tenantId, guildId, updateData);

    const container = ContainerService.create({
      title: '⚙️ Symphony | Configuration Updated',
      description: 'The music engine settings have been successfully updated.',
      color: '#27AE60',
      fields: [
        { name: 'DJ Role', value: djRole ? `<@&${djRole.id}>` : '`Not Set`' },
        { name: 'Music Channel', value: channel ? `<#${channel.id}>` : '`Global`' },
        { name: 'Jukebox Lock', value: `\`${lockJukebox !== null ? (lockJukebox ? 'Enabled' : 'Disabled') : 'No Change'}\`` }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
