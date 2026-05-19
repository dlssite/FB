import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { TodRepository } from '../../database/TodRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('setup')
      .setDescription('⚙️ Configure Truth or Dare settings for this server.')
      .addStringOption(opt =>
        opt.setName('intensity')
          .setDescription('The maximum allowed intensity level.')
          .addChoices(
            { name: 'Soft (Family Friendly)', value: 'SOFT' },
            { name: 'Party (Suggestive/Teasing)', value: 'PARTY' },
            { name: 'Spicy (NSFW/Adult)', value: 'SPICY' }
          )
      )
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('The channel to use for the permanent Arena panel.')
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const tenantId = flamebornConfig.bot.tenant.id;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction, ContainerService.create({
        title: 'Permission Denied',
        description: '❌ You need **Manage Server** permissions to use this command.',
        color: '#EA5455',
        footer: true,
        interaction
      }));
    }

    const intensity = interaction.options.getString('intensity');
    const channel = interaction.options.getChannel('channel');

    const updateData: any = {};
    if (intensity) updateData.maxIntensity = intensity;
    if (channel) updateData.panelChannelId = channel.id;

    if (Object.keys(updateData).length === 0) {
      return await replyV2(interaction, ContainerService.create({
        title: 'ToD Setup',
        description: '❌ Please provide at least one option to update.',
        color: '#EA5455',
        footer: true,
        interaction
      }));
    }

    await TodRepository.updateSettings(tenantId, interaction.guild.id, updateData);

    return await replyV2(interaction, ContainerService.create({
      title: 'Setup Updated',
      description: `✅ Truth or Dare settings have been successfully updated.\n\n${intensity ? `**Intensity:** ${intensity}\n` : ''}${channel ? `**Panel Channel:** <#${channel.id}>` : ''}`,
      color: '#28C76F',
      footer: true,
      interaction
    }));
  }
};
