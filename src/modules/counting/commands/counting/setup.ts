import { SlashCommandSubcommandBuilder, ChannelType } from 'discord.js';
import { CountingRepository } from '../../database/CountingRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcmd: SlashCommandSubcommandBuilder) =>
    subcmd
      .setName('setup')
      .setDescription('Admin: Designate the counting channel and top role')
      .addChannelOption(option => 
        option.setName('channel').setDescription('The channel for the counting game').setRequired(true)
      )
      .addRoleOption(option => 
        option.setName('top_role').setDescription('The role for the top counter').setRequired(false)
      ),

  async execute(interaction: any) {
    const ctx = tenantStorage.getStore();
    const tenantId = ctx?.tenantId as string;
    const guildId = interaction.guildId as string;

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('top_role');
    const lang = interaction.locale;

    if (!channel && !role) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('counting', 'setup.no_changes', lang)), true);
    }

    const updateData: any = {};
    if (channel) {
      if (channel.type !== ChannelType.GuildText) {
        return await replyV2(interaction, ContainerService.simple('❌ Please select a standard text channel.'), true);
      }
      updateData.channelId = channel.id;
    }
    if (role) updateData.topRoleId = role.id;

    await CountingRepository.updateSettings(tenantId, guildId, updateData);

    const description = Translator.t('counting', 'setup.success', lang, {
      channel: channel?.id || 'Unchanged',
      role: role?.name || 'Unchanged'
    });

    return await replyV2(interaction, ContainerService.create({
      title: '⚙️ Counting Configuration',
      description,
      color: '#3498DB',
      interaction,
      footer: true
    }), true);
  }
};
