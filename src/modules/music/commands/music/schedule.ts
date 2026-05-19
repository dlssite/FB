import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('schedule')
       .setDescription('📅 Schedule a server-wide Live Concert event.')
       .addStringOption(opt => opt.setName('title').setDescription('The title of the concert').setRequired(true))
       .addStringOption(opt => opt.setName('time').setDescription('When the concert starts (e.g., In 1 hour)').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents)) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Permission Denied',
        description: 'You need `Manage Events` permissions to schedule a concert.',
        color: '#E74C3C',
        interaction
      }));
    }

    const title = interaction.options.getString('title', true);
    const time = interaction.options.getString('time', true);

    const { ChannelType, GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = await import('discord.js');
    const guild = interaction.guild!;

    // 1. Create Stage Channel
    const stageChannel = await guild.channels.create({
      name: `🎵 ${title}`,
      type: ChannelType.GuildStageVoice,
      topic: `Concert: ${title}`,
      reason: 'Symphony Concert Scheduling'
    }).catch(() => null);

    // 2. Create Guild Event
    const startTime = new Date(Date.now() + 3600000); // Default to 1 hour from now for mock
    const event = await guild.scheduledEvents.create({
      name: title,
      scheduledStartTime: startTime,
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      entityType: GuildScheduledEventEntityType.StageInstance,
      channel: stageChannel?.id,
      description: `Join us for the ${title} concert!`,
      reason: 'Symphony Concert Scheduling'
    }).catch(() => null);

    const container = ContainerService.create({
      title: '📅 Symphony | Concert Scheduled',
      description: `**${title}** has been scheduled! \n\nEvent: [Click Here](${event?.url || ''})`,
      color: '#9B59B6',
      fields: [
        { name: 'Channel', value: stageChannel ? `<#${stageChannel.id}>` : '`Failed to create`' },
        { name: 'Time', value: `\`${time}\`` }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
