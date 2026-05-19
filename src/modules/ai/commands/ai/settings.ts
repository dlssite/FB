import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { AiRepository } from '../../database/AiRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('Manage which channels the Cognitive Engine is bound to.')
       .addChannelOption(opt => 
         opt.setName('channel')
            .setDescription('The channel to bind/unbind')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
       )
       .addBooleanOption(opt =>
         opt.setName('enabled')
            .setDescription('Enable AI in this channel?')
            .setRequired(true)
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: '❌ You need Manage Server permissions to configure AI settings.' });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    const enabled = interaction.options.getBoolean('enabled', true);
    const context = tenantStorage.getStore();

    if (!context || !interaction.guildId) return;

    let settings = await AiRepository.getSettings(interaction.guildId, context.tenantId);
    let boundChannels = settings?.boundChannels ? (settings.boundChannels as string[]) : [];

    if (enabled) {
      if (!boundChannels.includes(channel.id)) boundChannels.push(channel.id);
    } else {
      boundChannels = boundChannels.filter(id => id !== channel.id);
    }

    await AiRepository.upsertSettings(interaction.guildId, context.tenantId, {
      boundChannels,
      enabled: true // ensure it's globally enabled if they are configuring it
    });

    const payload = ContainerService.simple(`✅ Cognitive Engine is now **${enabled ? 'enabled' : 'disabled'}** for <#${channel.id}>.`, { color: '#00FF00', withFooter: true, interaction });
    await replyV2(interaction, payload);
  }
};
