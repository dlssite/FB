import { SlashCommandSubcommandBuilder, ChannelType } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('set-news-channel')
       .setDescription('📡 Configure which channel receives marketplace news broadcasts.')
       .addChannelOption(opt => 
         opt.setName('channel')
            .setDescription('The channel to send news to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
       ),

  async execute(interaction: any) {
    const { guild, options } = interaction;
    const tenantId = interaction.tenantId || 'tenant_alpha_01';
    const guildId = guild.id;
    const channel = options.getChannel('channel', true);

    await prisma.shop_settings.upsert({
      where: { guildId_tenantId: { guildId, tenantId } },
      update: { newsChannelId: channel.id },
      create: { 
        guildId, 
        tenantId, 
        newsChannelId: channel.id 
      }
    });

    return await replyV2(interaction, ContainerService.simple(`✅ Marketplace News will now be broadcasted to ${channel}.`));
  }
};
